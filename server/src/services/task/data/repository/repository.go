package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/diploma/task-service/data/database"
	"github.com/diploma/task-service/data/models"
	"github.com/jackc/pgx/v5"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// ========== Task Operations ==========

// CreateTask создает новую задачу
func (r *Repository) CreateTask(ctx context.Context, task *models.Task) (*models.Task, error) {
	query := `
		INSERT INTO tasks (creator, workspacesid, title, description, date, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, creator, workspacesid, title, description, date, status
	`

	err := r.db.Pool.QueryRow(ctx, query,
		task.Creator,
		task.WorkspaceID,
		task.Title,
		task.Description,
		task.Date,
		task.Status,
	).Scan(
		&task.ID,
		&task.Creator,
		&task.WorkspaceID,
		&task.Title,
		&task.Description,
		&task.Date,
		&task.Status,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	// Добавляем запись в историю изменений
	changeDesc := fmt.Sprintf("Задача создана: %s", task.Title)
	if err := r.addTaskChange(ctx, task.ID, changeDesc); err != nil {
		// Не возвращаем ошибку, так как задача уже создана
		fmt.Printf("Warning: failed to add task change: %v\n", err)
	}

	return task, nil
}

// GetTasksByWorkspace получает список задач рабочего пространства
func (r *Repository) GetTasksByWorkspace(ctx context.Context, workspaceID, userID int) ([]models.TaskWithDetails, error) {
	query := `
		SELECT
			t.id,
			t.creator,
			u.surname || ' ' || u.name as creator_name,
			u.surname as creator_surname,
			t.workspacesid as workspace_id,
			w.name as workspace_name,
			t.title,
			t.description,
			t.date,
			t.status,
			COALESCE((SELECT COUNT(*) FROM "userInTask" WHERE tasksid = t.id), 0) as assignee_count,
			COALESCE((SELECT COUNT(*) FROM "taskInChat" WHERE tasksid = t.id), 0) as chat_count,
			t.date as created_at
		FROM tasks t
		INNER JOIN users u ON t.creator = u.id
		INNER JOIN workspaces w ON t.workspacesid = w.id
		INNER JOIN "userInWorkspace" uiw ON w.id = uiw.workspacesid AND uiw.usersid = $2
		WHERE t.workspacesid = $1
		ORDER BY t.date DESC, t.id DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, workspaceID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks: %w", err)
	}
	defer rows.Close()

	var tasks []models.TaskWithDetails
	for rows.Next() {
		var task models.TaskWithDetails
		err := rows.Scan(
			&task.ID,
			&task.Creator,
			&task.CreatorName,
			&task.CreatorSurname,
			&task.WorkspaceID,
			&task.WorkspaceName,
			&task.Title,
			&task.Description,
			&task.Date,
			&task.Status,
			&task.AssigneeCount,
			&task.ChatCount,
			&task.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

// GetTaskByID получает информацию о задаче по ID
func (r *Repository) GetTaskByID(ctx context.Context, taskID, userID int) (*models.TaskWithDetails, error) {
	query := `
		SELECT
			t.id,
			t.creator,
			u.surname || ' ' || u.name as creator_name,
			u.surname as creator_surname,
			t.workspacesid as workspace_id,
			w.name as workspace_name,
			t.title,
			t.description,
			t.date,
			t.status,
			COALESCE((SELECT COUNT(*) FROM "userInTask" WHERE tasksid = t.id), 0) as assignee_count,
			COALESCE((SELECT COUNT(*) FROM "taskInChat" WHERE tasksid = t.id), 0) as chat_count,
			t.date as created_at
		FROM tasks t
		INNER JOIN users u ON t.creator = u.id
		INNER JOIN workspaces w ON t.workspacesid = w.id
		INNER JOIN "userInWorkspace" uiw ON w.id = uiw.workspacesid AND uiw.usersid = $2
		WHERE t.id = $1
	`

	var task models.TaskWithDetails
	err := r.db.Pool.QueryRow(ctx, query, taskID, userID).Scan(
		&task.ID,
		&task.Creator,
		&task.CreatorName,
		&task.CreatorSurname,
		&task.WorkspaceID,
		&task.WorkspaceName,
		&task.Title,
		&task.Description,
		&task.Date,
		&task.Status,
		&task.AssigneeCount,
		&task.ChatCount,
		&task.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("task not found")
		}
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	return &task, nil
}

// UpdateTask обновляет задачу
func (r *Repository) UpdateTask(ctx context.Context, taskID int, title, description *string, date *time.Time) error {
	query := `
		UPDATE tasks
		SET title = COALESCE($2, title),
		    description = COALESCE($3, description),
		    date = COALESCE($4, date)
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(ctx, query, taskID, title, description, date)
	if err != nil {
		return fmt.Errorf("failed to update task: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("task not found")
	}

	// Добавляем запись в историю изменений
	changeDesc := "Задача обновлена"
	if err := r.addTaskChange(ctx, taskID, changeDesc); err != nil {
		fmt.Printf("Warning: failed to add task change: %v\n", err)
	}

	return nil
}

// DeleteTask удаляет задачу
func (r *Repository) DeleteTask(ctx context.Context, taskID int) error {
	query := `DELETE FROM tasks WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, taskID)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

// UpdateTaskStatus обновляет статус задачи
func (r *Repository) UpdateTaskStatus(ctx context.Context, taskID, status int) error {
	query := `UPDATE tasks SET status = $2 WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, taskID, status)
	if err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("task not found")
	}

	// Добавляем запись в историю изменений
	changeDesc := fmt.Sprintf("Статус изменен на: %s", models.GetTaskStatusName(status))
	if err := r.addTaskChange(ctx, taskID, changeDesc); err != nil {
		fmt.Printf("Warning: failed to add task change: %v\n", err)
	}

	return nil
}

// ========== Assignee Operations ==========

// AddTaskAssignee добавляет исполнителя к задаче
func (r *Repository) AddTaskAssignee(ctx context.Context, taskID, userID int) error {
	query := `
		INSERT INTO "userInTask" (tasksid, usersid)
		VALUES ($1, $2)
		ON CONFLICT (tasksid, usersid) DO NOTHING
	`

	result, err := r.db.Pool.Exec(ctx, query, taskID, userID)
	if err != nil {
		return fmt.Errorf("failed to add task assignee: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("assignee already exists or invalid task/user")
	}

	// Добавляем запись в историю изменений
	changeDesc := fmt.Sprintf("Добавлен исполнитель с ID: %d", userID)
	if err := r.addTaskChange(ctx, taskID, changeDesc); err != nil {
		fmt.Printf("Warning: failed to add task change: %v\n", err)
	}

	return nil
}

// GetTaskAssignees получает список исполнителей задачи
func (r *Repository) GetTaskAssignees(ctx context.Context, taskID int) ([]models.TaskAssignee, error) {
	query := `
		SELECT
			u.id as user_id,
			u.login,
			u.name,
			u.surname,
			u.patronymic,
			uit.tasksid as assigned_at
		FROM "userInTask" uit
		INNER JOIN users u ON uit.usersid = u.id
		WHERE uit.tasksid = $1
		ORDER BY u.surname, u.name
	`

	rows, err := r.db.Pool.Query(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task assignees: %w", err)
	}
	defer rows.Close()

	var assignees []models.TaskAssignee
	for rows.Next() {
		var assignee models.TaskAssignee
		err := rows.Scan(
			&assignee.UserID,
			&assignee.Login,
			&assignee.Name,
			&assignee.Surname,
			&assignee.Patronymic,
			&assignee.AssignedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan assignee: %w", err)
		}
		assignees = append(assignees, assignee)
	}

	return assignees, nil
}

// RemoveTaskAssignee удаляет исполнителя из задачи
func (r *Repository) RemoveTaskAssignee(ctx context.Context, taskID, userID int) error {
	query := `DELETE FROM "userInTask" WHERE tasksid = $1 AND usersid = $2`

	result, err := r.db.Pool.Exec(ctx, query, taskID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove task assignee: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("assignee not found")
	}

	// Добавляем запись в историю изменений
	changeDesc := fmt.Sprintf("Удален исполнитель с ID: %d", userID)
	if err := r.addTaskChange(ctx, taskID, changeDesc); err != nil {
		fmt.Printf("Warning: failed to add task change: %v\n", err)
	}

	return nil
}

// ========== Chat Operations ==========

// AttachTaskToChat прикрепляет задачу к чату
func (r *Repository) AttachTaskToChat(ctx context.Context, taskID, chatID int) error {
	query := `
		INSERT INTO "taskInChat" (chatsid, tasksid)
		VALUES ($1, $2)
		ON CONFLICT (chatsid, tasksid) DO NOTHING
	`

	result, err := r.db.Pool.Exec(ctx, query, chatID, taskID)
	if err != nil {
		return fmt.Errorf("failed to attach task to chat: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("task already attached to chat or invalid chat/task")
	}

	// Добавляем запись в историю изменений
	changeDesc := fmt.Sprintf("Прикреплена к чату ID: %d", chatID)
	if err := r.addTaskChange(ctx, taskID, changeDesc); err != nil {
		fmt.Printf("Warning: failed to add task change: %v\n", err)
	}

	return nil
}

// GetTaskChats получает список чатов, к которым прикреплена задача
func (r *Repository) GetTaskChats(ctx context.Context, taskID int) ([]models.TaskChat, error) {
	query := `
		SELECT
			c.id as chat_id,
			c.name as chat_name,
			c.type as chat_type,
			c.workspacesid as workspace_id,
			tic.chatsid as attached_at
		FROM "taskInChat" tic
		INNER JOIN chats c ON tic.chatsid = c.id
		WHERE tic.tasksid = $1
		ORDER BY c.name
	`

	rows, err := r.db.Pool.Query(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task chats: %w", err)
	}
	defer rows.Close()

	var chats []models.TaskChat
	for rows.Next() {
		var chat models.TaskChat
		err := rows.Scan(
			&chat.ChatID,
			&chat.ChatName,
			&chat.ChatType,
			&chat.WorkspaceID,
			&chat.AttachedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan chat: %w", err)
		}
		chats = append(chats, chat)
	}

	return chats, nil
}

// DetachTaskFromChat открепляет задачу от чата
func (r *Repository) DetachTaskFromChat(ctx context.Context, taskID, chatID int) error {
	query := `DELETE FROM "taskInChat" WHERE chatsid = $1 AND tasksid = $2`

	result, err := r.db.Pool.Exec(ctx, query, chatID, taskID)
	if err != nil {
		return fmt.Errorf("failed to detach task from chat: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("task not attached to chat")
	}

	// Добавляем запись в историю изменений
	changeDesc := fmt.Sprintf("Откреплена от чата ID: %d", chatID)
	if err := r.addTaskChange(ctx, taskID, changeDesc); err != nil {
		fmt.Printf("Warning: failed to add task change: %v\n", err)
	}

	return nil
}

// ========== History Operations ==========

// GetTaskHistory получает историю изменений задачи
func (r *Repository) GetTaskHistory(ctx context.Context, taskID int) ([]models.TaskChange, error) {
	query := `
		SELECT id, description, tasksid
		FROM "taskChanges"
		WHERE tasksid = $1
		ORDER BY id DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task history: %w", err)
	}
	defer rows.Close()

	var changes []models.TaskChange
	for rows.Next() {
		var change models.TaskChange
		err := rows.Scan(
			&change.ID,
			&change.Description,
			&change.TaskID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan change: %w", err)
		}
		changes = append(changes, change)
	}

	return changes, nil
}

// ========== Validation Operations ==========

// ValidateUserInWorkspace проверяет, что пользователь является участником рабочего пространства
func (r *Repository) ValidateUserInWorkspace(ctx context.Context, userID, workspaceID int) error {
	query := `
		SELECT 1 FROM "userInWorkspace"
		WHERE usersid = $1 AND workspacesid = $2
	`

	var exists int
	err := r.db.Pool.QueryRow(ctx, query, userID, workspaceID).Scan(&exists)
	if err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("user is not a member of workspace")
		}
		return fmt.Errorf("failed to validate user in workspace: %w", err)
	}

	return nil
}

// ValidateTaskOwnership проверяет, что задача принадлежит указанному рабочему пространству
func (r *Repository) ValidateTaskOwnership(ctx context.Context, taskID, workspaceID int) error {
	query := `
		SELECT 1 FROM tasks
		WHERE id = $1 AND workspacesid = $2
	`

	var exists int
	err := r.db.Pool.QueryRow(ctx, query, taskID, workspaceID).Scan(&exists)
	if err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("task not found in workspace")
		}
		return fmt.Errorf("failed to validate task ownership: %w", err)
	}

	return nil
}

// ValidateChatOwnership проверяет, что чат принадлежит указанному рабочему пространству
func (r *Repository) ValidateChatOwnership(ctx context.Context, chatID, workspaceID int) error {
	query := `
		SELECT 1 FROM chats
		WHERE id = $1 AND workspacesid = $2
	`

	var exists int
	err := r.db.Pool.QueryRow(ctx, query, chatID, workspaceID).Scan(&exists)
	if err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("chat not found in workspace")
		}
		return fmt.Errorf("failed to validate chat ownership: %w", err)
	}

	return nil
}

// ========== Helper Methods ==========

// addTaskChange добавляет запись в историю изменений задачи
func (r *Repository) addTaskChange(ctx context.Context, taskID int, description string) error {
	query := `
		INSERT INTO "taskChanges" (description, tasksid)
		VALUES ($1, $2)
	`

	_, err := r.db.Pool.Exec(ctx, query, description, taskID)
	if err != nil {
		return fmt.Errorf("failed to add task change: %w", err)
	}

	return nil
}




