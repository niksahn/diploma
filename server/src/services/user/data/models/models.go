package models

// User представляет структуру пользователя в БД
type User struct {
	ID         int     `db:"id"`
	Login      string  `db:"login"`
	Password   string  `db:"password"` // Не используется в User Service, но есть в БД
	Surname    string  `db:"surname"`
	Name       string  `db:"name"`
	Patronymic *string `db:"patronymic"`
	Status     int     `db:"status"`
}

// UserInWorkspace представляет связь пользователя с рабочим пространством
type UserInWorkspace struct {
	UserID      int    `db:"usersid"`
	WorkspaceID int    `db:"workspacesid"`
	Role        int    `db:"role"`
	Date        string `db:"date"`
}
