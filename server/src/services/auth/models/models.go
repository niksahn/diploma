package models

import "time"

// User представляет пользователя системы
type User struct {
	ID         int    `json:"id" db:"id"`
	Login      string `json:"login" db:"login"`
	Password   string `json:"-" db:"password"` // Не возвращаем в JSON
	Surname    string `json:"surname" db:"surname"`
	Name       string `json:"name" db:"name"`
	Patronymic *string `json:"patronymic,omitempty" db:"patronymic"`
	Status     int    `json:"status" db:"status"`
}

// Administrator представляет администратора системы
type Administrator struct {
	ID       int    `json:"id" db:"id"`
	Login    string `json:"login" db:"login"`
	Password string `json:"-" db:"password"` // Не возвращаем в JSON
}

// RefreshToken представляет refresh токен в БД
type RefreshToken struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Token     string    `json:"token" db:"token"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	Revoked   bool      `json:"revoked" db:"revoked"`
	Role      string    `json:"role" db:"role"` // "user" или "admin"
}

// RegisterRequest запрос на регистрацию пользователя
type RegisterRequest struct {
	Login      string  `json:"login" binding:"required,min=3,max=50"`
	Password   string  `json:"password" binding:"required,min=8"`
	Surname    string  `json:"surname" binding:"required,min=2,max=40"`
	Name       string  `json:"name" binding:"required,min=2,max=40"`
	Patronymic *string `json:"patronymic,omitempty" binding:"omitempty,max=40"`
}

// LoginRequest запрос на вход
type LoginRequest struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RefreshRequest запрос на обновление токена
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RegisterResponse ответ на регистрацию
type RegisterResponse struct {
	ID      int    `json:"id"`
	Login   string `json:"login"`
	Message string `json:"message"`
}

// LoginResponse ответ на вход
type LoginResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	ExpiresIn    int         `json:"expires_in"`
	User         *UserInfo   `json:"user,omitempty"`
	Admin        *AdminInfo  `json:"admin,omitempty"`
}

// UserInfo информация о пользователе в ответе
type UserInfo struct {
	ID       int    `json:"id"`
	Login    string `json:"login"`
	Name     string `json:"name"`
	Surname  string `json:"surname"`
	Status   int    `json:"status"`
}

// AdminInfo информация об администраторе в ответе
type AdminInfo struct {
	ID    int    `json:"id"`
	Login string `json:"login"`
}

// RefreshResponse ответ на обновление токена
type RefreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// LogoutResponse ответ на выход
type LogoutResponse struct {
	Message string `json:"message"`
}

// ValidateResponse ответ на валидацию токена
type ValidateResponse struct {
	Valid     bool   `json:"valid"`
	UserID    *int   `json:"user_id,omitempty"`
	Role      string `json:"role,omitempty"`
	ExpiresAt string `json:"expires_at,omitempty"`
	Error     string `json:"error,omitempty"`
}

// ErrorResponse стандартный ответ об ошибке
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

