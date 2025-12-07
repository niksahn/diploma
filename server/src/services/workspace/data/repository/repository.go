package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/diploma/workspace-service/data/database"
	"github.com/diploma/workspace-service/data/models"
	"github.com/jackc/pgx/v5"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// ========== Workspace Operations ==========

// CreateWorkspace создает новое рабочее пространство
func (r *Repository) CreateWorkspace(ctx context.Context, name string, creatorID, tariffID int) (*models.Workspace, error) {
	query := `
		INSERT INTO workspaces (name, creator, tariffsid)
		VALUES ($1, $2, $3)
		RETURNING id, name, creator, tariffsid
	`

	var workspace models.Workspace
	err := r.db.Pool.QueryRow(ctx, query, name, creatorID, tariffID).Scan(
		&workspace.ID,
		&workspace.Name,
		&workspace.Creator,
		&workspace.TariffsID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create workspace: %w", err)
	}

	return &workspace, nil
}

// GetWorkspaceByID получает информацию о рабочем пространстве
func (r *Repository) GetWorkspaceByID(ctx context.Context, workspaceID int) (*models.WorkspaceWithDetails, error) {
	query := `
		SELECT 
			w.id,
			w.name,
			w.creator,
			w.tariffsid as tariff_id,
			t.name as tariff_name,
			t.description as tariff_description,
			COALESCE((SELECT COUNT(*) FROM "userinworkspace" WHERE workspacesid = w.id), 0) as members_count,
			COALESCE((SELECT COUNT(*) FROM chats WHERE workspacesid = w.id), 0) as chats_count,
			COALESCE((SELECT COUNT(*) FROM tasks WHERE workspacesid = w.id), 0) as tasks_count
		FROM workspaces w
		LEFT JOIN tariffs t ON w.tariffsid = t.id
		WHERE w.id = $1
	`

	var workspace models.WorkspaceWithDetails
	err := r.db.Pool.QueryRow(ctx, query, workspaceID).Scan(
		&workspace.ID,
		&workspace.Name,
		&workspace.Creator,
		&workspace.TariffID,
		&workspace.TariffName,
		&workspace.TariffDesc,
		&workspace.MembersCount,
		&workspace.ChatsCount,
		&workspace.TasksCount,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("workspace not found")
		}
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	return &workspace, nil
}

// GetUserWorkspaces получает список рабочих пространств пользователя
func (r *Repository) GetUserWorkspaces(ctx context.Context, userID int) ([]models.UserWorkspace, error) {
	query := `
		SELECT w.id, w.name, uiw.role, uiw.date
		FROM workspaces w
		INNER JOIN "userinworkspace" uiw ON w.id = uiw.workspacesid
		WHERE uiw.usersid = $1
		ORDER BY uiw.date DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []models.UserWorkspace
	for rows.Next() {
		var workspace models.UserWorkspace
		err := rows.Scan(
			&workspace.ID,
			&workspace.Name,
			&workspace.Role,
			&workspace.JoinedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workspace: %w", err)
		}
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

// UpdateWorkspace обновляет параметры рабочего пространства
func (r *Repository) UpdateWorkspace(ctx context.Context, workspaceID int, name string, tariffID int) error {
	query := `
		UPDATE workspaces
		SET name = $1, tariffsid = $2
		WHERE id = $3
	`

	result, err := r.db.Pool.Exec(ctx, query, name, tariffID, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to update workspace: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("workspace not found")
	}

	return nil
}

// DeleteWorkspace удаляет рабочее пространство
func (r *Repository) DeleteWorkspace(ctx context.Context, workspaceID int) error {
	// Удаление будет каскадным благодаря внешним ключам
	query := `DELETE FROM workspaces WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to delete workspace: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("workspace not found")
	}

	return nil
}

// WorkspaceExists проверяет существование рабочего пространства
func (r *Repository) WorkspaceExists(ctx context.Context, workspaceID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM workspaces WHERE id = $1)`

	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, workspaceID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check workspace existence: %w", err)
	}

	return exists, nil
}

// WorkspaceNameExists проверяет существование РП с таким именем
func (r *Repository) WorkspaceNameExists(ctx context.Context, name string, excludeID *int) (bool, error) {
	var query string
	var args []interface{}

	if excludeID != nil {
		query = `SELECT EXISTS(SELECT 1 FROM workspaces WHERE name = $1 AND id != $2)`
		args = []interface{}{name, *excludeID}
	} else {
		query = `SELECT EXISTS(SELECT 1 FROM workspaces WHERE name = $1)`
		args = []interface{}{name}
	}

	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, args...).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check workspace name: %w", err)
	}

	return exists, nil
}

// ========== Member Operations ==========

// AddMember добавляет пользователя в рабочее пространство
func (r *Repository) AddMember(ctx context.Context, workspaceID, userID, role int) error {
	query := `
		INSERT INTO "userinworkspace" (usersid, workspacesid, role, date)
		VALUES ($1, $2, $3, $4)
	`

	_, err := r.db.Pool.Exec(ctx, query, userID, workspaceID, role, time.Now())
	if err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}

	return nil
}

// GetMembers получает список участников рабочего пространства
func (r *Repository) GetMembers(ctx context.Context, workspaceID int) ([]models.WorkspaceMember, error) {
	query := `
		SELECT 
			u.id as user_id,
			u.login,
			u.name,
			u.surname,
			u.patronymic,
			uiw.role,
			u.status,
			uiw.date as joined_at
		FROM users u
		INNER JOIN "userinworkspace" uiw ON u.id = uiw.usersid
		WHERE uiw.workspacesid = $1
		ORDER BY u.surname, u.name
	`

	rows, err := r.db.Pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get members: %w", err)
	}
	defer rows.Close()

	var members []models.WorkspaceMember
	for rows.Next() {
		var member models.WorkspaceMember
		var patronymic sql.NullString

		err := rows.Scan(
			&member.UserID,
			&member.Login,
			&member.Name,
			&member.Surname,
			&patronymic,
			&member.Role,
			&member.Status,
			&member.JoinedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}

		if patronymic.Valid {
			member.Patronymic = &patronymic.String
		}

		members = append(members, member)
	}

	return members, nil
}

// UpdateMemberRole изменяет роль пользователя в рабочем пространстве
func (r *Repository) UpdateMemberRole(ctx context.Context, workspaceID, userID, role int) error {
	query := `
		UPDATE "userinworkspace"
		SET role = $1
		WHERE workspacesid = $2 AND usersid = $3
	`

	result, err := r.db.Pool.Exec(ctx, query, role, workspaceID, userID)
	if err != nil {
		return fmt.Errorf("failed to update member role: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("member not found in workspace")
	}

	return nil
}

// RemoveMember удаляет пользователя из рабочего пространства
func (r *Repository) RemoveMember(ctx context.Context, workspaceID, userID int) error {
	query := `
		DELETE FROM "userinworkspace"
		WHERE workspacesid = $1 AND usersid = $2
	`

	result, err := r.db.Pool.Exec(ctx, query, workspaceID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("member not found in workspace")
	}

	return nil
}

// IsMemberOfWorkspace проверяет, является ли пользователь участником РП
func (r *Repository) IsMemberOfWorkspace(ctx context.Context, userID, workspaceID int) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM "userinworkspace"
			WHERE usersid = $1 AND workspacesid = $2
		)
	`

	var isMember bool
	err := r.db.Pool.QueryRow(ctx, query, userID, workspaceID).Scan(&isMember)
	if err != nil {
		return false, fmt.Errorf("failed to check membership: %w", err)
	}

	return isMember, nil
}

// GetUserRoleInWorkspace получает роль пользователя в РП
func (r *Repository) GetUserRoleInWorkspace(ctx context.Context, userID, workspaceID int) (int, error) {
	query := `
		SELECT role FROM "userinworkspace"
		WHERE usersid = $1 AND workspacesid = $2
	`

	var role int
	err := r.db.Pool.QueryRow(ctx, query, userID, workspaceID).Scan(&role)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0, fmt.Errorf("user is not a member of workspace")
		}
		return 0, fmt.Errorf("failed to get user role: %w", err)
	}

	return role, nil
}

// ChangeLeader меняет руководителя рабочего пространства
func (r *Repository) ChangeLeader(ctx context.Context, workspaceID, oldLeaderID, newLeaderID int) error {
	// Начинаем транзакцию
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Понижаем старого руководителя до участника (роль 1)
	updateOldQuery := `
		UPDATE "userinworkspace"
		SET role = 1
		WHERE workspacesid = $1 AND usersid = $2 AND role = 2
	`
	result, err := tx.Exec(ctx, updateOldQuery, workspaceID, oldLeaderID)
	if err != nil {
		return fmt.Errorf("failed to update old leader: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("old leader not found or not a leader")
	}

	// Повышаем нового руководителя (роль 2)
	updateNewQuery := `
		UPDATE "userinworkspace"
		SET role = 2
		WHERE workspacesid = $1 AND usersid = $2
	`
	result, err = tx.Exec(ctx, updateNewQuery, workspaceID, newLeaderID)
	if err != nil {
		return fmt.Errorf("failed to update new leader: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("new leader not found in workspace")
	}

	// Коммитим транзакцию
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// ========== Tariff Operations ==========

// GetAllTariffs получает список всех тарифов
func (r *Repository) GetAllTariffs(ctx context.Context) ([]models.Tariff, error) {
	query := `SELECT id, name, description FROM tariffs ORDER BY id`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get tariffs: %w", err)
	}
	defer rows.Close()

	var tariffs []models.Tariff
	for rows.Next() {
		var tariff models.Tariff
		err := rows.Scan(&tariff.ID, &tariff.Name, &tariff.Description)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tariff: %w", err)
		}
		tariffs = append(tariffs, tariff)
	}

	return tariffs, nil
}

// CreateTariff создает новый тариф
func (r *Repository) CreateTariff(ctx context.Context, name, description string) (*models.Tariff, error) {
	query := `
		INSERT INTO tariffs (name, description)
		VALUES ($1, $2)
		RETURNING id, name, description
	`

	var tariff models.Tariff
	err := r.db.Pool.QueryRow(ctx, query, name, description).Scan(
		&tariff.ID,
		&tariff.Name,
		&tariff.Description,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create tariff: %w", err)
	}

	return &tariff, nil
}

// UpdateTariff обновляет тариф
func (r *Repository) UpdateTariff(ctx context.Context, tariffID int, name, description string) (*models.Tariff, error) {
	query := `
		UPDATE tariffs
		SET name = $1, description = $2
		WHERE id = $3
		RETURNING id, name, description
	`

	var tariff models.Tariff
	err := r.db.Pool.QueryRow(ctx, query, name, description, tariffID).Scan(
		&tariff.ID,
		&tariff.Name,
		&tariff.Description,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("tariff not found")
		}
		return nil, fmt.Errorf("failed to update tariff: %w", err)
	}

	return &tariff, nil
}

// TariffExists проверяет существование тарифа
func (r *Repository) TariffExists(ctx context.Context, tariffID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM tariffs WHERE id = $1)`

	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, tariffID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check tariff existence: %w", err)
	}

	return exists, nil
}

// UserExists проверяет существование пользователя
func (r *Repository) UserExists(ctx context.Context, userID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`

	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check user existence: %w", err)
	}

	return exists, nil
}
