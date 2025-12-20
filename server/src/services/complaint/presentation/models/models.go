package models

// CreateComplaintRequest описывает тело запроса на создание жалобы.
type CreateComplaintRequest struct {
	Text              string `json:"text" binding:"required,min=10,max=255" example:"Application crashes when uploading large files"`
	DeviceDescription string `json:"device_description" binding:"required,min=5,max=255" example:"Windows 10, Chrome 120.0, 16GB RAM"`
	UserEmail         string `json:"user_email" binding:"required,email" example:"user@example.com"`
}

// UpdateStatusRequest описывает тело запроса на смену статуса.
type UpdateStatusRequest struct {
	Status  string  `json:"status" binding:"required,oneof=pending in_progress resolved rejected" example:"resolved"`
	Comment *string `json:"comment,omitempty" binding:"omitempty,max=500" example:"Issue fixed in version 1.2.3"`
}

// ComplaintStatusHistoryResponse элемент истории статусов.
type ComplaintStatusHistoryResponse struct {
	ID             int    `json:"id" example:"1"`
	Status         string `json:"status" example:"in_progress"`
	Comment        string `json:"comment,omitempty" example:"Investigating the issue"`
	ChangedBy      int    `json:"changed_by,omitempty" example:"1"`
	ChangedByLogin string `json:"changed_by_login,omitempty" example:"admin@example.com"`
	ChangedAt      string `json:"changed_at" example:"2024-01-01T14:00:00Z"`
}

// ComplaintResponse базовый ответ по жалобе.
type ComplaintResponse struct {
	ID                int    `json:"id" example:"1"`
	Text              string `json:"text" example:"Application crashes when uploading large files"`
	Date              string `json:"date" example:"2024-01-01"`
	DeviceDescription string `json:"device_description" example:"Windows 10, Chrome 120.0, 16GB RAM"`
	Author            int    `json:"author" example:"1"`
	AuthorName        string `json:"author_name,omitempty" example:"Ivan Ivanov"`
	AuthorLogin       string `json:"author_login,omitempty" example:"ivan@example.com"`
	AuthorEmail       string `json:"author_email,omitempty" example:"ivan@example.com"`
	Status            string `json:"status" example:"pending"`
	AssignedTo        string `json:"assigned_to,omitempty" example:"admin@example.com"`
	CreatedAt         string `json:"created_at" example:"2024-01-01T12:00:00Z"`
	UpdatedAt         string `json:"updated_at" example:"2024-01-01T12:00:00Z"`
}

// ComplaintDetailResponse детальный ответ по жалобе.
type ComplaintDetailResponse struct {
	ComplaintResponse
	StatusHistory []ComplaintStatusHistoryResponse `json:"status_history"`
}

// ComplaintListResponse ответ списка жалоб.
type ComplaintListResponse struct {
	Complaints []ComplaintResponse `json:"complaints"`
	Total      int                 `json:"total" example:"2"`
	Limit      int                 `json:"limit" example:"20"`
	Offset     int                 `json:"offset" example:"0"`
}

// ErrorResponse стандартная ошибка.
type ErrorResponse struct {
	Error string `json:"error" example:"not found"`
}
