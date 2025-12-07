package databaseModels

// Chat представляет структуру чата в БД
type Chat struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	Type        int    `db:"type"`
	WorkspaceID int    `db:"workspacesid"`
}

// Message представляет структуру сообщения в БД
type Message struct {
	ID     int    `db:"id"`
	ChatID int    `db:"chatsid"`
	UserID int    `db:"usersid"`
	Text   string `db:"text"`
	Date   int    `db:"date"`   // Unix timestamp
	Status string `db:"status"` // JSON строка с информацией о прочитанности
}

// UserInChat представляет связь пользователя с чатом
type UserInChat struct {
	ID     int    `db:"id"`
	ChatID int    `db:"chatsid"`
	UserID int    `db:"usersid"`
	Role   int    `db:"role"` // 1 = участник, 2 = администратор
	Date   string `db:"date"` // Дата присоединения
}










