package models

import "time"

// Workspace представляет рабочее пространство
type Workspace struct {
	ID        int    `db:"id"`
	Name      string `db:"name"`
	Creator   int    `db:"creator"`
	TariffsID int    `db:"tariffsid"`
}

// WorkspaceWithDetails представляет РП с дополнительной информацией
type WorkspaceWithDetails struct {
	ID           int       `db:"id"`
	Name         string    `db:"name"`
	Creator      int       `db:"creator"`
	TariffID     int       `db:"tariff_id"`
	TariffName   string    `db:"tariff_name"`
	TariffDesc   string    `db:"tariff_description"`
	MembersCount int       `db:"members_count"`
	ChatsCount   int       `db:"chats_count"`
	TasksCount   int       `db:"tasks_count"`
	CreatedAt    time.Time `db:"created_at"`
}

// UserWorkspace представляет РП пользователя с его ролью
type UserWorkspace struct {
	ID       int       `db:"id"`
	Name     string    `db:"name"`
	Role     int       `db:"role"`
	JoinedAt time.Time `db:"date"`
}

// UserInWorkspace представляет связь пользователя с РП
type UserInWorkspace struct {
	UserID      int       `db:"usersid"`
	WorkspaceID int       `db:"workspacesid"`
	Role        int       `db:"role"`
	Date        time.Time `db:"date"`
}

// WorkspaceMember представляет участника РП с полной информацией
type WorkspaceMember struct {
	UserID     int       `db:"user_id"`
	Login      string    `db:"login"`
	Name       string    `db:"name"`
	Surname    string    `db:"surname"`
	Patronymic *string   `db:"patronymic"`
	Role       int       `db:"role"`
	Status     int       `db:"status"`
	JoinedAt   time.Time `db:"joined_at"`
}

// Tariff представляет тарифный план
type Tariff struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	Description string `db:"description"`
}
