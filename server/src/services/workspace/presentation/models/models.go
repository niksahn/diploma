package models

// CreateWorkspaceRequest запрос на создание РП
type CreateWorkspaceRequest struct {
	Name     string `json:"name" binding:"required,min=3,max=100"`
	TariffID int    `json:"tariff_id" binding:"required"`
	LeaderID int    `json:"leader_id" binding:"required"`
}

// UpdateWorkspaceRequest запрос на обновление РП
type UpdateWorkspaceRequest struct {
	Name     string `json:"name" binding:"required,min=3,max=100"`
	TariffID int    `json:"tariff_id" binding:"required"`
}

// AddMemberRequest запрос на добавление участника
type AddMemberRequest struct {
	UserID int `json:"user_id" binding:"required"`
	Role   int `json:"role" binding:"required,min=1,max=2"`
}

// UpdateMemberRoleRequest запрос на изменение роли
type UpdateMemberRoleRequest struct {
	Role int `json:"role" binding:"required,min=1,max=2"`
}

// ChangeLeaderRequest запрос на смену руководителя
type ChangeLeaderRequest struct {
	NewLeaderID int `json:"new_leader_id" binding:"required"`
}

// CreateTariffRequest запрос на создание тарифа
type CreateTariffRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description" binding:"required"`
}

// UpdateTariffRequest запрос на обновление тарифа
type UpdateTariffRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description" binding:"required"`
}

// WorkspaceResponse ответ с информацией о РП
type WorkspaceResponse struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Creator   int    `json:"creator"`
	TariffsID int    `json:"tariffs_id"`
	CreatedAt string `json:"created_at,omitempty"`
}

// WorkspaceDetailsResponse детальная информация о РП
type WorkspaceDetailsResponse struct {
	ID           int        `json:"id"`
	Name         string     `json:"name"`
	Creator      int        `json:"creator"`
	Tariff       TariffInfo `json:"tariff"`
	MembersCount int        `json:"members_count"`
	ChatsCount   int        `json:"chats_count"`
	TasksCount   int        `json:"tasks_count"`
	CreatedAt    string     `json:"created_at,omitempty"`
}

// TariffInfo информация о тарифе
type TariffInfo struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// UserWorkspaceResponse РП пользователя
type UserWorkspaceResponse struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Role     int    `json:"role"`
	JoinedAt string `json:"joined_at"`
}

// UserWorkspacesResponse список РП пользователя
type UserWorkspacesResponse struct {
	Workspaces []UserWorkspaceResponse `json:"workspaces"`
	Total      int                     `json:"total"`
}

// MemberResponse информация об участнике
type MemberResponse struct {
	UserID     int     `json:"user_id"`
	Login      string  `json:"login"`
	Name       string  `json:"name"`
	Surname    string  `json:"surname"`
	Patronymic *string `json:"patronymic,omitempty"`
	Role       int     `json:"role"`
	Status     int     `json:"status"`
	JoinedAt   string  `json:"joined_at"`
}

// MembersResponse список участников
type MembersResponse struct {
	Members []MemberResponse `json:"members"`
	Total   int              `json:"total"`
}

// MemberAddedResponse ответ при добавлении участника
type MemberAddedResponse struct {
	UserID      int    `json:"user_id"`
	WorkspaceID int    `json:"workspace_id"`
	Role        int    `json:"role"`
	Date        string `json:"date"`
}

// MemberRoleUpdatedResponse ответ при изменении роли
type MemberRoleUpdatedResponse struct {
	UserID      int    `json:"user_id"`
	WorkspaceID int    `json:"workspace_id"`
	Role        int    `json:"role"`
	UpdatedAt   string `json:"updated_at"`
}

// LeaderChangedResponse ответ при смене руководителя
type LeaderChangedResponse struct {
	WorkspaceID int    `json:"workspace_id"`
	OldLeaderID int    `json:"old_leader_id"`
	NewLeaderID int    `json:"new_leader_id"`
	UpdatedAt   string `json:"updated_at"`
}

// TariffResponse информация о тарифе
type TariffResponse struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// TariffsResponse список тарифов
type TariffsResponse struct {
	Tariffs []TariffResponse `json:"tariffs"`
}

// ErrorResponse ответ с ошибкой
type ErrorResponse struct {
	Error string `json:"error"`
}
