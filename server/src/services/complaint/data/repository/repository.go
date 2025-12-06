package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/diploma/complaint-service/data/database"
	"github.com/diploma/complaint-service/data/models"
	"github.com/jackc/pgx/v5"
)

// Repository инкапсулирует работу с БД.
type Repository struct {
	db *database.DB
}

// NewRepository создает экземпляр репозитория.
func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// CreateComplaint создает новую жалобу со статусом pending.
func (r *Repository) CreateComplaint(ctx context.Context, authorID int, text, deviceDescription string) (*models.ComplaintWithUser, error) {
	query := `
		INSERT INTO complaints (text, devicedescription, author, status)
		VALUES ($1, $2, $3, 'pending')
		RETURNING id, text, date, devicedescription, author, status, created_at, updated_at
	`

	var complaint models.Complaint
	if err := r.db.Pool.QueryRow(ctx, query, text, deviceDescription, authorID).Scan(
		&complaint.ID,
		&complaint.Text,
		&complaint.Date,
		&complaint.DeviceDescription,
		&complaint.Author,
		&complaint.Status,
		&complaint.CreatedAt,
		&complaint.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("failed to insert complaint: %w", err)
	}

	authorName, authorLogin, err := r.fetchAuthor(ctx, authorID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch author info: %w", err)
	}

	return &models.ComplaintWithUser{
		Complaint:   complaint,
		AuthorName:  authorName,
		AuthorLogin: authorLogin,
	}, nil
}

// GetComplaint возвращает жалобу по ID.
func (r *Repository) GetComplaint(ctx context.Context, id int) (*models.ComplaintWithUser, error) {
	query := `
		SELECT c.id, c.text, c.date, c.devicedescription, c.author, c.status, c.created_at, c.updated_at,
		       u.surname, u.name, u.login,
		       la.login AS assigned_to
		FROM complaints c
		JOIN users u ON u.id = c.author
		LEFT JOIN (
			SELECT DISTINCT ON (complaint_id) complaint_id, a.login
			FROM complaint_status_history h
			LEFT JOIN administrators a ON a.id = h.changed_by
			ORDER BY complaint_id, h.created_at DESC
		) la ON la.complaint_id = c.id
		WHERE c.id = $1
	`

	var complaint models.Complaint
	var surname, name, login string
	var assigned sql.NullString

	if err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&complaint.ID,
		&complaint.Text,
		&complaint.Date,
		&complaint.DeviceDescription,
		&complaint.Author,
		&complaint.Status,
		&complaint.CreatedAt,
		&complaint.UpdatedAt,
		&surname,
		&name,
		&login,
		&assigned,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("complaint not found")
		}
		return nil, fmt.Errorf("failed to get complaint: %w", err)
	}

	var assignedTo *string
	if assigned.Valid {
		assignedTo = &assigned.String
	}

	return &models.ComplaintWithUser{
		Complaint:   complaint,
		AuthorName:  strings.TrimSpace(fmt.Sprintf("%s %s", surname, name)),
		AuthorLogin: login,
		AssignedTo:  assignedTo,
	}, nil
}

// GetComplaintHistory возвращает историю изменения статусов жалобы.
func (r *Repository) GetComplaintHistory(ctx context.Context, complaintID int) ([]models.ComplaintStatusHistory, error) {
	query := `
		SELECT h.id, h.complaint_id, h.status, h.comment, h.changed_by, h.created_at, a.login
		FROM complaint_status_history h
		LEFT JOIN administrators a ON a.id = h.changed_by
		WHERE h.complaint_id = $1
		ORDER BY h.created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, complaintID)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %w", err)
	}
	defer rows.Close()

	var history []models.ComplaintStatusHistory
	for rows.Next() {
		var item models.ComplaintStatusHistory
		var comment sql.NullString
		var changedBy sql.NullInt64
		var changedByLogin sql.NullString

		if err := rows.Scan(
			&item.ID,
			&item.ComplaintID,
			&item.Status,
			&comment,
			&changedBy,
			&item.CreatedAt,
			&changedByLogin,
		); err != nil {
			return nil, fmt.Errorf("failed to scan history: %w", err)
		}

		if comment.Valid {
			item.Comment = &comment.String
		}
		if changedBy.Valid {
			id := int(changedBy.Int64)
			item.ChangedBy = &id
		}
		if changedByLogin.Valid {
			item.ChangedByLogin = &changedByLogin.String
		}

		history = append(history, item)
	}

	return history, nil
}

// ListComplaints возвращает список жалоб с учетом фильтров.
func (r *Repository) ListComplaints(ctx context.Context, filter models.ComplaintFilter) ([]models.ComplaintWithUser, int, error) {
	conditions := []string{}
	args := []interface{}{}
	argNum := 1

	if filter.Status != nil && *filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("c.status = $%d", argNum))
		args = append(args, *filter.Status)
		argNum++
	}

	if filter.IsAdmin {
		if filter.AuthorID != nil {
			conditions = append(conditions, fmt.Sprintf("c.author = $%d", argNum))
			args = append(args, *filter.AuthorID)
			argNum++
		}
	} else {
		conditions = append(conditions, fmt.Sprintf("c.author = $%d", argNum))
		args = append(args, filter.ViewerID)
		argNum++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM complaints c " + whereClause
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count complaints: %w", err)
	}

	listQuery := fmt.Sprintf(`
		SELECT c.id, c.text, c.date, c.devicedescription, c.author, c.status, c.created_at, c.updated_at,
		       u.surname, u.name, u.login,
		       la.login AS assigned_to
		FROM complaints c
		JOIN users u ON u.id = c.author
		LEFT JOIN (
			SELECT DISTINCT ON (complaint_id) complaint_id, a.login
			FROM complaint_status_history h
			LEFT JOIN administrators a ON a.id = h.changed_by
			WHERE h.changed_by IS NOT NULL
			ORDER BY complaint_id, h.created_at DESC
		) la ON la.complaint_id = c.id
		%s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argNum, argNum+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list complaints: %w", err)
	}
	defer rows.Close()

	var result []models.ComplaintWithUser
	for rows.Next() {
		var complaint models.Complaint
		var surname, name, login string
		var assigned sql.NullString

		if err := rows.Scan(
			&complaint.ID,
			&complaint.Text,
			&complaint.Date,
			&complaint.DeviceDescription,
			&complaint.Author,
			&complaint.Status,
			&complaint.CreatedAt,
			&complaint.UpdatedAt,
			&surname,
			&name,
			&login,
			&assigned,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan complaint: %w", err)
		}

		var assignedTo *string
		if assigned.Valid {
			assignedTo = &assigned.String
		}

		result = append(result, models.ComplaintWithUser{
			Complaint:   complaint,
			AuthorName:  strings.TrimSpace(fmt.Sprintf("%s %s", surname, name)),
			AuthorLogin: login,
			AssignedTo:  assignedTo,
		})
	}

	return result, total, nil
}

// UpdateComplaintStatus обновляет статус жалобы и пишет историю.
func (r *Repository) UpdateComplaintStatus(ctx context.Context, complaintID int, status string, comment *string, adminID int) (*models.ComplaintStatusHistory, error) {
	tx, err := r.db.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2`, status, complaintID)
	if err != nil {
		return nil, fmt.Errorf("failed to update complaint: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("complaint not found")
	}

	var history models.ComplaintStatusHistory
	var commentVal sql.NullString
	var changedBy sql.NullInt64
	if err := tx.QueryRow(ctx, `
		INSERT INTO complaint_status_history (complaint_id, status, comment, changed_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, complaint_id, status, comment, changed_by, created_at
	`, complaintID, status, comment, adminID).Scan(
		&history.ID,
		&history.ComplaintID,
		&history.Status,
		&commentVal,
		&changedBy,
		&history.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("failed to insert history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	if commentVal.Valid {
		history.Comment = &commentVal.String
	}
	if changedBy.Valid {
		id := int(changedBy.Int64)
		history.ChangedBy = &id

		var login sql.NullString
		if err := r.db.Pool.QueryRow(ctx, `SELECT login FROM administrators WHERE id = $1`, id).Scan(&login); err == nil {
			if login.Valid {
				history.ChangedByLogin = &login.String
			}
		}
	}

	return &history, nil
}

// DeleteComplaint удаляет жалобу.
func (r *Repository) DeleteComplaint(ctx context.Context, id int) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM complaints WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete complaint: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("complaint not found")
	}
	return nil
}

// fetchAuthor получает ФИО и логин автора.
func (r *Repository) fetchAuthor(ctx context.Context, authorID int) (string, string, error) {
	var surname, name, login string
	if err := r.db.Pool.QueryRow(ctx, `SELECT surname, name, login FROM users WHERE id = $1`, authorID).Scan(&surname, &name, &login); err != nil {
		return "", "", err
	}
	return strings.TrimSpace(fmt.Sprintf("%s %s", surname, name)), login, nil
}
