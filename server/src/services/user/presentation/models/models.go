package models

// UserResponse представляет ответ с данными пользователя
// @Description Информация о пользователе
type UserResponse struct {
	ID         int    `json:"id" example:"1"`
	Login      string `json:"login" example:"user@example.com"`
	Surname    string `json:"surname" example:"Ivanov"`
	Name       string `json:"name" example:"Ivan"`
	Patronymic string `json:"patronymic,omitempty" example:"Ivanovich"`
	Status     int    `json:"status" example:"1"`
}

// UpdateProfileRequest представляет запрос на обновление профиля
// @Description Данные для обновления профиля пользователя
type UpdateProfileRequest struct {
	Surname    string  `json:"surname" binding:"required,min=2,max=40" example:"Petrov"`
	Name       string  `json:"name" binding:"required,min=2,max=40" example:"Petr"`
	Patronymic *string `json:"patronymic,omitempty" binding:"omitempty,max=40" example:"Petrovich"`
}

// UpdateStatusRequest представляет запрос на обновление статуса
// @Description Новый статус пользователя (1=Онлайн, 2=Не беспокоить, 3=Отошел, 4=Офлайн)
type UpdateStatusRequest struct {
	Status int `json:"status" binding:"required,min=1,max=4" example:"2"`
}

// UpdateStatusResponse представляет ответ на обновление статуса
// @Description Результат обновления статуса
type UpdateStatusResponse struct {
	ID        int    `json:"id" example:"1"`
	Status    int    `json:"status" example:"2"`
	UpdatedAt string `json:"updated_at" example:"2024-01-01T12:00:00Z"`
}

// SearchUsersResponse представляет ответ на поиск пользователей
// @Description Список найденных пользователей с пагинацией
type SearchUsersResponse struct {
	Users  []UserResponse `json:"users"`
	Total  int            `json:"total" example:"2"`
	Limit  int            `json:"limit" example:"20"`
	Offset int            `json:"offset" example:"0"`
}

// WorkspaceUserResponse представляет пользователя в рабочем пространстве
// @Description Информация о пользователе в контексте рабочего пространства
type WorkspaceUserResponse struct {
	ID         int    `json:"id" example:"1"`
	Login      string `json:"login" example:"user@example.com"`
	Surname    string `json:"surname" example:"Ivanov"`
	Name       string `json:"name" example:"Ivan"`
	Patronymic string `json:"patronymic,omitempty" example:"Ivanovich"`
	Status     int    `json:"status" example:"1"`
	Role       int    `json:"role" example:"2"`
	JoinedAt   string `json:"joined_at" example:"2024-01-01"`
}

// WorkspaceUsersResponse представляет ответ со списком пользователей рабочего пространства
// @Description Список всех пользователей рабочего пространства
type WorkspaceUsersResponse struct {
	Users []WorkspaceUserResponse `json:"users"`
	Total int                     `json:"total" example:"2"`
}



























