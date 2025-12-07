package models

import (
	"time"
)

// CreateTaskRequest запрос на создание задачи
type CreateTaskRequest struct {
	WorkspaceID   int     `json:"workspace_id" binding:"required"`
	Title         string  `json:"title" binding:"required,min=3,max=100"`
	Description   *string `json:"description,omitempty"`
	Date          string  `json:"date" binding:"required"` // ожидаем YYYY-MM-DD
	Status        int     `json:"status,omitempty"`
	AssignedUsers []int   `json:"assigned_users,omitempty"`
	ChatID        *int    `json:"chat_id,omitempty"`
}

// UpdateTaskRequest запрос на обновление задачи
type UpdateTaskRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Date        *string `json:"date,omitempty"` // YYYY-MM-DD
}

// UpdateTaskStatusRequest запрос на изменение статуса задачи
type UpdateTaskStatusRequest struct {
	Status int `json:"status" binding:"required,min=1,max=5"`
}

// AddTaskAssigneesRequest запрос на добавление исполнителей
type AddTaskAssigneesRequest struct {
	UserIDs []int `json:"user_ids" binding:"required,min=1"`
}

// AttachTaskToChatRequest запрос на прикрепление задачи к чату
type AttachTaskToChatRequest struct {
	ChatID int `json:"chat_id" binding:"required"`
}

// TaskResponse ответ с информацией о задаче
type TaskResponse struct {
	ID            int       `json:"id"`
	Creator       int       `json:"creator"`
	CreatorName   string    `json:"creator_name"`
	WorkspaceID   int       `json:"workspace_id"`
	WorkspaceName string    `json:"workspace_name"`
	Title         string    `json:"title"`
	Description   *string   `json:"description,omitempty"`
	Date          time.Time `json:"date"`
	Status        int       `json:"status"`
	StatusName    string    `json:"status_name"`
	AssigneeCount int       `json:"assignee_count"`
	ChatCount     int       `json:"chat_count"`
	CreatedAt     time.Time `json:"created_at"`
}

// TaskListResponse ответ со списком задач
type TaskListResponse struct {
	Tasks []TaskResponse `json:"tasks"`
	Total int            `json:"total"`
}

// TaskAssigneeResponse ответ с информацией об исполнителе
type TaskAssigneeResponse struct {
	UserID     int       `json:"user_id"`
	Login      string    `json:"login"`
	Name       string    `json:"name"`
	Surname    string    `json:"surname"`
	Patronymic *string   `json:"patronymic,omitempty"`
	AssignedAt time.Time `json:"assigned_at"`
}

// TaskAssigneesResponse ответ со списком исполнителей
type TaskAssigneesResponse struct {
	Assignees []TaskAssigneeResponse `json:"assignees"`
	Total     int                    `json:"total"`
}

// TaskChatResponse ответ с информацией о чате задачи
type TaskChatResponse struct {
	ChatID      int       `json:"chat_id"`
	ChatName    string    `json:"chat_name"`
	ChatType    int       `json:"chat_type"`
	WorkspaceID int       `json:"workspace_id"`
	AttachedAt  time.Time `json:"attached_at"`
}

// TaskChatsResponse ответ со списком чатов задачи
type TaskChatsResponse struct {
	Chats []TaskChatResponse `json:"chats"`
	Total int                `json:"total"`
}

// TaskChangeResponse ответ с информацией об изменении задачи
type TaskChangeResponse struct {
	ID          int       `json:"id"`
	Description string    `json:"description"`
	TaskID      int       `json:"task_id"`
	ChangedAt   time.Time `json:"changed_at"`
}

// TaskHistoryResponse ответ с историей изменений задачи
type TaskHistoryResponse struct {
	Changes []TaskChangeResponse `json:"changes"`
	Total   int                  `json:"total"`
}

// ErrorResponse ответ с ошибкой
type ErrorResponse struct {
	Error string `json:"error"`
}

// SuccessResponse успешный ответ
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
