package models

// ChatResponse представляет ответ с данными чата
// @Description Информация о чате
type ChatResponse struct {
	ID           int    `json:"id" example:"1"`
	Name         string `json:"name" example:"Project Discussion"`
	Type         int    `json:"type" example:"2"`
	WorkspaceID  int    `json:"workspace_id" example:"1"`
	CreatedAt    string `json:"created_at,omitempty" example:"2024-01-01T00:00:00Z"`
	MembersCount int    `json:"members_count,omitempty" example:"4"`
	MyRole       int    `json:"my_role,omitempty" example:"2"`
}

// CreateChatRequest представляет запрос на создание чата
// @Description Данные для создания нового чата
type CreateChatRequest struct {
	Name        string `json:"name" binding:"required,min=3,max=100" example:"Project Discussion"`
	Type        int    `json:"type" binding:"required,min=1,max=3" example:"2"`
	WorkspaceID int    `json:"workspace_id" binding:"required" example:"1"`
	Members     []int  `json:"members" binding:"required,min=1" example:"1,2,3,5"`
}

// UpdateChatRequest представляет запрос на обновление чата
// @Description Данные для обновления чата
type UpdateChatRequest struct {
	Name string `json:"name" binding:"required,min=3,max=100" example:"Updated Project Discussion"`
}

// ChatListItem представляет элемент списка чатов
// @Description Информация о чате в списке
type ChatListItem struct {
	ID           int              `json:"id" example:"1"`
	Name         string           `json:"name" example:"Project Discussion"`
	Type         int              `json:"type" example:"2"`
	WorkspaceID  int              `json:"workspace_id" example:"1"`
	LastMessage  *LastMessageInfo `json:"last_message,omitempty"`
	UnreadCount  int              `json:"unread_count" example:"5"`
	MembersCount int              `json:"members_count" example:"4"`
}

// LastMessageInfo представляет информацию о последнем сообщении
type LastMessageInfo struct {
	Text     string `json:"text" example:"Hello everyone!"`
	Date     int    `json:"date" example:"1704110400"`
	UserName string `json:"user_name" example:"Ivan Ivanov"`
}

// ChatListResponse представляет ответ со списком чатов
// @Description Список чатов пользователя
type ChatListResponse struct {
	Chats []ChatListItem `json:"chats"`
	Total int            `json:"total" example:"2"`
}

// AddMembersRequest представляет запрос на добавление участников
// @Description Данные для добавления участников в чат
type AddMembersRequest struct {
	UserIDs []int `json:"user_ids" binding:"required,min=1" example:"4,6,7"`
	Role    int   `json:"role" binding:"required,min=1,max=2" example:"1"`
}

// AddMembersResponse представляет ответ на добавление участников
// @Description Результат добавления участников
type AddMembersResponse struct {
	Added  []int `json:"added" example:"4,6,7"`
	ChatID int   `json:"chat_id" example:"1"`
}

// ChatMemberResponse представляет участника чата
// @Description Информация об участнике чата
type ChatMemberResponse struct {
	ID         int    `json:"id" example:"1"`
	UserID     int    `json:"user_id" example:"1"`
	Login      string `json:"login" example:"user@example.com"`
	Name       string `json:"name" example:"Ivan"`
	Surname    string `json:"surname" example:"Ivanov"`
	Patronymic string `json:"patronymic,omitempty" example:"Ivanovich"`
	Role       int    `json:"role" example:"2"`
	Status     int    `json:"status" example:"1"`
	JoinedAt   string `json:"joined_at" example:"2024-01-01"`
}

// ChatMembersResponse представляет ответ со списком участников
// @Description Список участников чата
type ChatMembersResponse struct {
	Members []ChatMemberResponse `json:"members"`
	Total   int                  `json:"total" example:"2"`
}

// UpdateMemberRoleRequest представляет запрос на изменение роли участника
// @Description Новая роль участника (1=участник, 2=администратор)
type UpdateMemberRoleRequest struct {
	Role int `json:"role" binding:"required,min=1,max=2" example:"2"`
}

// UpdateMemberRoleResponse представляет ответ на изменение роли
// @Description Результат изменения роли
type UpdateMemberRoleResponse struct {
	UserID int `json:"user_id" example:"3"`
	ChatID int `json:"chat_id" example:"1"`
	Role   int `json:"role" example:"2"`
}

// MessageResponse представляет ответ с данными сообщения
// @Description Информация о сообщении
type MessageResponse struct {
	ID       int    `json:"id" example:"1"`
	ChatID   int    `json:"chat_id" example:"1"`
	UserID   int    `json:"user_id" example:"1"`
	UserName string `json:"user_name" example:"Ivan Ivanov"`
	Text     string `json:"text" example:"Hello everyone!"`
	Date     int    `json:"date" example:"1704110400"`
	Status   string `json:"status" example:"read"`
	Edited   bool   `json:"edited" example:"false"`
}

// CreateMessageRequest представляет запрос на создание сообщения
// @Description Данные для создания нового сообщения
type CreateMessageRequest struct {
	Text string `json:"text" binding:"required,min=1,max=1000" example:"Hello everyone!"`
}

// UpdateMessageRequest представляет запрос на обновление сообщения
// @Description Новый текст сообщения
type UpdateMessageRequest struct {
	Text string `json:"text" binding:"required,min=1,max=1000" example:"Updated message text"`
}

// UpdateMessageResponse представляет ответ на обновление сообщения
// @Description Результат обновления сообщения
type UpdateMessageResponse struct {
	ID       int    `json:"id" example:"1"`
	ChatID   int    `json:"chat_id" example:"1"`
	Text     string `json:"text" example:"Updated message text"`
	Edited   bool   `json:"edited" example:"true"`
	EditedAt string `json:"edited_at" example:"2024-01-01T12:05:00Z"`
}

// MessagesResponse представляет ответ со списком сообщений
// @Description Список сообщений чата
type MessagesResponse struct {
	Messages []MessageResponse `json:"messages"`
	HasMore  bool              `json:"has_more" example:"false"`
	Total    int               `json:"total" example:"2"`
}

// MarkAsReadRequest представляет запрос на отметку сообщений как прочитанных
// @Description ID последнего прочитанного сообщения
type MarkAsReadRequest struct {
	LastMessageID int `json:"last_message_id" binding:"required" example:"100"`
}

// MarkAsReadResponse представляет ответ на отметку сообщений как прочитанных
// @Description Результат отметки сообщений
type MarkAsReadResponse struct {
	ChatID            int `json:"chat_id" example:"1"`
	MarkedAsRead      int `json:"marked_as_read" example:"15"`
	LastReadMessageID int `json:"last_read_message_id" example:"100"`
}

// WebSocket message types

// WSClientMessage представляет сообщение от клиента через WebSocket
type WSClientMessage struct {
	Type   string `json:"type"`
	ChatID int    `json:"chat_id,omitempty"`
	Text   string `json:"text,omitempty"`
}

// WSServerMessage представляет сообщение от сервера через WebSocket
type WSServerMessage struct {
	Type      string           `json:"type"`
	Message   *MessageResponse `json:"message,omitempty"`
	MessageID int              `json:"message_id,omitempty"`
	ChatID    int              `json:"chat_id,omitempty"`
	Text      string           `json:"text,omitempty"`
	EditedAt  int              `json:"edited_at,omitempty"`
	UserID    int              `json:"user_id,omitempty"`
	UserName  string           `json:"user_name,omitempty"`
	Error     *WSError         `json:"error,omitempty"`
}

// WSError представляет ошибку в WebSocket сообщении
type WSError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
