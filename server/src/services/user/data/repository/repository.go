package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/diploma/user-service/data/database"
	"github.com/diploma/user-service/data/models"
	"github.com/jackc/pgx/v5"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// GetUserByID получает пользователя по ID
func (r *Repository) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	query := `
		SELECT id, login, surname, name, patronymic, status
		FROM users
		WHERE id = $1
	`

	var user models.User
	var patronymic sql.NullString

	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
		&user.ID,
		&user.Login,
		&user.Surname,
		&user.Name,
		&patronymic,
		&user.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if patronymic.Valid {
		user.Patronymic = &patronymic.String
	}

	return &user, nil
}

// GetUserByLogin получает пользователя по login
func (r *Repository) GetUserByLogin(ctx context.Context, login string) (*models.User, error) {
	query := `
		SELECT id, login, surname, name, patronymic, status
		FROM users
		WHERE login = $1
	`

	var user models.User
	var patronymic sql.NullString

	err := r.db.Pool.QueryRow(ctx, query, login).Scan(
		&user.ID,
		&user.Login,
		&user.Surname,
		&user.Name,
		&patronymic,
		&user.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if patronymic.Valid {
		user.Patronymic = &patronymic.String
	}

	return &user, nil
}

// UpdateUserProfile обновляет профиль пользователя
func (r *Repository) UpdateUserProfile(ctx context.Context, userID int, surname, name string, patronymic *string) (*models.User, error) {
	query := `
		UPDATE users
		SET surname = $1, name = $2, patronymic = $3
		WHERE id = $4
		RETURNING id, login, surname, name, patronymic, status
	`

	var user models.User
	var patronymicVal sql.NullString

	err := r.db.Pool.QueryRow(ctx, query, surname, name, patronymic, userID).Scan(
		&user.ID,
		&user.Login,
		&user.Surname,
		&user.Name,
		&patronymicVal,
		&user.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to update user profile: %w", err)
	}

	if patronymicVal.Valid {
		user.Patronymic = &patronymicVal.String
	}

	return &user, nil
}

// UpdateUserStatus обновляет статус пользователя
func (r *Repository) UpdateUserStatus(ctx context.Context, userID int, status int) error {
	query := `
		UPDATE users
		SET status = $1
		WHERE id = $2
	`

	result, err := r.db.Pool.Exec(ctx, query, status, userID)
	if err != nil {
		return fmt.Errorf("failed to update user status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// SearchUsers выполняет поиск пользователей с фильтрацией
func (r *Repository) SearchUsers(ctx context.Context, search string, workspaceID *int, status *int, limit, offset int) ([]models.User, int, error) {
	var conditions []string
	var args []interface{}
	argNum := 1

	// Определяем префикс для таблицы
	tablePrefix := ""
	if workspaceID != nil {
		tablePrefix = "u."
	}

	// Базовый запрос
	var baseQuery, countQuery string
	if workspaceID != nil {
		baseQuery = `FROM users u
			INNER JOIN "userInWorkspace" uiw ON u.id = uiw.usersid`
		countQuery = `SELECT COUNT(DISTINCT u.id) FROM users u
			INNER JOIN "userInWorkspace" uiw ON u.id = uiw.usersid`
	} else {
		baseQuery = "FROM users"
		countQuery = "SELECT COUNT(*) FROM users"
	}

	// Фильтр по поиску
	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(LOWER(%slogin) LIKE LOWER($%d) OR LOWER(%ssurname) LIKE LOWER($%d) OR LOWER(%sname) LIKE LOWER($%d))", tablePrefix, argNum, tablePrefix, argNum+1, tablePrefix, argNum+2))
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
		argNum += 3
	}

	// Фильтр по статусу
	if status != nil {
		conditions = append(conditions, fmt.Sprintf("%sstatus = $%d", tablePrefix, argNum))
		args = append(args, *status)
		argNum++
	}

	// Фильтр по рабочему пространству
	if workspaceID != nil {
		conditions = append(conditions, fmt.Sprintf("uiw.workspacesid = $%d", argNum))
		args = append(args, *workspaceID)
		argNum++
	}

	// Добавляем условия
	if len(conditions) > 0 {
		whereClause := " WHERE " + strings.Join(conditions, " AND ")
		baseQuery += whereClause
		countQuery += whereClause
	}

	// Получаем общее количество
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Получаем пользователей с пагинацией
	var selectQuery string
	if workspaceID != nil {
		selectQuery = fmt.Sprintf(`
			SELECT DISTINCT u.id, u.login, u.surname, u.name, u.patronymic, u.status
			%s
			ORDER BY u.surname, u.name
			LIMIT $%d OFFSET $%d
		`, baseQuery, argNum, argNum+1)
	} else {
		selectQuery = fmt.Sprintf(`
			SELECT id, login, surname, name, patronymic, status
			%s
			ORDER BY surname, name
			LIMIT $%d OFFSET $%d
		`, baseQuery, argNum, argNum+1)
	}

	args = append(args, limit, offset)

	rows, err := r.db.Pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var patronymic sql.NullString

		err := rows.Scan(
			&user.ID,
			&user.Login,
			&user.Surname,
			&user.Name,
			&patronymic,
			&user.Status,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}

		if patronymic.Valid {
			user.Patronymic = &patronymic.String
		}

		users = append(users, user)
	}

	return users, total, nil
}

// WorkspaceUser представляет пользователя в рабочем пространстве с дополнительной информацией
type WorkspaceUser struct {
	User     models.User
	Role     int
	JoinedAt string
}

// GetUsersByWorkspace получает всех пользователей рабочего пространства
func (r *Repository) GetUsersByWorkspace(ctx context.Context, workspaceID int) ([]WorkspaceUser, error) {
	query := `
		SELECT u.id, u.login, u.surname, u.name, u.patronymic, u.status, uiw.role, uiw.date
		FROM users u
		INNER JOIN "userInWorkspace" uiw ON u.id = uiw.usersid
		WHERE uiw.workspacesid = $1
		ORDER BY u.surname, u.name
	`

	rows, err := r.db.Pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get users by workspace: %w", err)
	}
	defer rows.Close()

	var result []WorkspaceUser
	for rows.Next() {
		var user models.User
		var patronymic sql.NullString
		var wu WorkspaceUser

		err := rows.Scan(
			&user.ID,
			&user.Login,
			&user.Surname,
			&user.Name,
			&patronymic,
			&user.Status,
			&wu.Role,
			&wu.JoinedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}

		if patronymic.Valid {
			user.Patronymic = &patronymic.String
		}

		wu.User = user
		result = append(result, wu)
	}

	return result, nil
}

// IsWorkspaceLeader проверяет, является ли пользователь руководителем хотя бы одного РП, где состоит целевой пользователь
func (r *Repository) IsWorkspaceLeader(ctx context.Context, leaderID, targetUserID int) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM "userInWorkspace" uiw1
		INNER JOIN "userInWorkspace" uiw2 ON uiw1.workspacesid = uiw2.workspacesid
		WHERE uiw1.usersid = $1
		  AND uiw1.role = 1
		  AND uiw2.usersid = $2
	`

	var isLeader bool
	err := r.db.Pool.QueryRow(ctx, query, leaderID, targetUserID).Scan(&isLeader)
	if err != nil {
		return false, fmt.Errorf("failed to check workspace leader: %w", err)
	}

	return isLeader, nil
}

// IsUserInWorkspace проверяет, является ли пользователь участником рабочего пространства
func (r *Repository) IsUserInWorkspace(ctx context.Context, userID, workspaceID int) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM "userInWorkspace"
		WHERE usersid = $1 AND workspacesid = $2
	`

	var isMember bool
	err := r.db.Pool.QueryRow(ctx, query, userID, workspaceID).Scan(&isMember)
	if err != nil {
		return false, fmt.Errorf("failed to check user in workspace: %w", err)
	}

	return isMember, nil
}

