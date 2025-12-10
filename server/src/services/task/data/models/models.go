package models

import "time"

// Task представляет задачу
type Task struct {
	ID          int       `db:"id"`
	Creator     int       `db:"creator"`
	WorkspaceID int       `db:"workspacesid"`
	Title       string    `db:"title"`
	Description *string   `db:"description"`
	Date        time.Time `db:"date"`
	Status      int       `db:"status"`
	CreatedAt   time.Time `db:"created_at,omitempty"`
}

// TaskWithDetails представляет задачу с дополнительной информацией
type TaskWithDetails struct {
	ID            int       `db:"id"`
	Creator       int       `db:"creator"`
	CreatorName   string    `db:"creator_name"`
	CreatorSurname string   `db:"creator_surname"`
	WorkspaceID   int       `db:"workspace_id"`
	WorkspaceName string    `db:"workspace_name"`
	Title         string    `db:"title"`
	Description   *string   `db:"description"`
	Date          time.Time `db:"date"`
	Status        int       `db:"status"`
	AssigneeCount int       `db:"assignee_count"`
	ChatCount     int       `db:"chat_count"`
	CreatedAt     time.Time `db:"created_at"`
}

// UserInTask представляет связь пользователя с задачей (исполнитель)
type UserInTask struct {
	ID     int `db:"id"`
	TaskID int `db:"tasksid"`
	UserID int `db:"usersid"`
}

// TaskAssignee представляет исполнителя задачи с информацией о пользователе
type TaskAssignee struct {
	UserID     int    `db:"user_id"`
	Login      string `db:"login"`
	Name       string `db:"name"`
	Surname    string `db:"surname"`
	AssignedAt string `db:"assigned_at"`
}

// TaskInChat представляет связь задачи с чатом
type TaskInChat struct {
	ID     int `db:"id"`
	ChatID int `db:"chatsid"`
	TaskID int `db:"tasksid"`
}

// TaskChat представляет чат, связанный с задачей
type TaskChat struct {
	ChatID      int    `db:"chat_id"`
	ChatName    string `db:"chat_name"`
	ChatType    int    `db:"chat_type"`
	WorkspaceID int    `db:"workspace_id"`
	AttachedAt  string `db:"attached_at"`
}

// TaskChange представляет изменение задачи (история)
type TaskChange struct {
	ID          int       `db:"id"`
	Description string    `db:"description"`
	TaskID      int       `db:"tasksid"`
	ChangedAt   time.Time `db:"changed_at,omitempty"`
}

// Константы статусов задач
const (
	TaskStatusCreated   = 1 // Создана
	TaskStatusInWork    = 2 // В работе
	TaskStatusReview    = 3 // На проверке
	TaskStatusCompleted = 4 // Завершена
	TaskStatusCancelled = 5 // Отменена
)

// IsValidTaskStatus проверяет валидность статуса задачи
func IsValidTaskStatus(status int) bool {
	return status >= TaskStatusCreated && status <= TaskStatusCancelled
}

// GetTaskStatusName возвращает название статуса задачи
func GetTaskStatusName(status int) string {
	switch status {
	case TaskStatusCreated:
		return "Создана"
	case TaskStatusInWork:
		return "В работе"
	case TaskStatusReview:
		return "На проверке"
	case TaskStatusCompleted:
		return "Завершена"
	case TaskStatusCancelled:
		return "Отменена"
	default:
		return "Неизвестный статус"
	}
}




