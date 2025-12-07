package handlers

import (
	"net/http"
	"time"

	"github.com/diploma/auth-service/config"
	"github.com/diploma/auth-service/models"
	"github.com/diploma/auth-service/repository"
	"github.com/diploma/auth-service/utils"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	repo *repository.Repository
	cfg  *config.Config
}

func NewAuthHandler(repo *repository.Repository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		repo: repo,
		cfg:  cfg,
	}
}

// Register регистрирует нового пользователя
// @Summary Регистрация пользователя
// @Description Регистрация нового пользователя в системе
// @Tags auth
// @Accept json
// @Produce json
// @Param request body models.RegisterRequest true "Данные для регистрации"
// @Success 201 {object} models.RegisterResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Хешируем пароль
	hashedPassword, err := utils.HashPassword(req.Password, h.cfg.BcryptCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to hash password",
		})
		return
	}

	// Создаем пользователя
	user := &models.User{
		Login:      req.Login,
		Password:   hashedPassword,
		Surname:    req.Surname,
		Name:       req.Name,
		Patronymic: req.Patronymic,
		Status:     1, // По умолчанию онлайн
	}

	if err := h.repo.CreateUser(c.Request.Context(), user); err != nil {
		if contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, models.ErrorResponse{
				Error:   "conflict",
				Message: "User with this login already exists",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create user",
		})
		return
	}

	c.JSON(http.StatusCreated, models.RegisterResponse{
		ID:      user.ID,
		Login:   user.Login,
		Message: "User created successfully",
	})
}

// Login выполняет вход пользователя
// @Summary Вход пользователя
// @Description Аутентификация пользователя и выдача JWT токенов
// @Tags auth
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "Данные для входа"
// @Success 200 {object} models.LoginResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Получаем пользователя
	user, err := h.repo.GetUserByLogin(c.Request.Context(), req.Login)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid login or password",
		})
		return
	}

	// Проверяем пароль
	if !utils.CheckPasswordHash(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid login or password",
		})
		return
	}

	// Обновляем статус на "Онлайн" (1)
	if err := h.repo.UpdateUserStatus(c.Request.Context(), user.ID, 1); err != nil {
		// Логируем ошибку, но не прерываем процесс входа
		_ = err
	}

	// Генерируем токены
	accessToken, err := utils.GenerateAccessToken(h.cfg, user.ID, "user")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate access token",
		})
		return
	}

	refreshToken, expiresAt, err := utils.GenerateRefreshToken(h.cfg, user.ID, "user")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate refresh token",
		})
		return
	}

	// Сохраняем refresh токен в БД
	refreshTokenModel := &models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: expiresAt,
		Revoked:   false,
		Role:      "user",
	}
	if err := h.repo.CreateRefreshToken(c.Request.Context(), refreshTokenModel); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to save refresh token",
		})
		return
	}

	user.Status = 1
	c.JSON(http.StatusOK, models.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    h.cfg.JWTAccessExpiration,
		User: &models.UserInfo{
			ID:      user.ID,
			Login:   user.Login,
			Name:    user.Name,
			Surname: user.Surname,
			Status:  user.Status,
		},
	})
}

// Refresh обновляет access токен
// @Summary Обновление токена
// @Description Обновление access токена с помощью refresh токена
// @Tags auth
// @Accept json
// @Produce json
// @Param request body models.RefreshRequest true "Refresh токен"
// @Success 200 {object} models.RefreshResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "Refresh token is required",
		})
		return
	}

	// Валидируем токен
	claims, err := utils.ValidateToken(h.cfg, req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid or expired refresh token",
		})
		return
	}

	// Проверяем, что это refresh токен
	if claims.Type != "refresh" {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid token type",
		})
		return
	}

	// Проверяем токен в БД
	dbToken, err := h.repo.GetRefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil || dbToken.Revoked {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Refresh token is revoked or not found",
		})
		return
	}

	// Проверяем срок действия
	if time.Now().After(dbToken.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Refresh token expired",
		})
		return
	}

	// Отзываем старый refresh токен
	_ = h.repo.RevokeRefreshToken(c.Request.Context(), req.RefreshToken)

	// Генерируем новый access токен
	accessToken, err := utils.GenerateAccessToken(h.cfg, claims.UserID, claims.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate access token",
		})
		return
	}

	// Генерируем новый refresh токен (одноразовые токены)
	newRefreshToken, expiresAt, err := utils.GenerateRefreshToken(h.cfg, claims.UserID, claims.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate refresh token",
		})
		return
	}

	// Сохраняем новый refresh токен
	newRefreshTokenModel := &models.RefreshToken{
		UserID:    claims.UserID,
		Token:     newRefreshToken,
		ExpiresAt: expiresAt,
		Revoked:   false,
		Role:      claims.Role,
	}
	if err := h.repo.CreateRefreshToken(c.Request.Context(), newRefreshTokenModel); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to save refresh token",
		})
		return
	}

	c.JSON(http.StatusOK, models.RefreshResponse{
		AccessToken: accessToken,
		ExpiresIn:   h.cfg.JWTAccessExpiration,
	})
}

// Logout выполняет выход пользователя
// @Summary Выход из системы
// @Description Выход пользователя и инвалидация refresh токенов
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.LogoutResponse
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	tokenString, err := utils.ExtractTokenFromHeader(authHeader)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Authorization header is required",
		})
		return
	}

	// Валидируем токен
	claims, err := utils.ValidateToken(h.cfg, tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid token",
		})
		return
	}

	// Отзываем все refresh токены пользователя
	if err := h.repo.RevokeAllUserTokens(c.Request.Context(), claims.UserID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to revoke tokens",
		})
		return
	}

	c.JSON(http.StatusOK, models.LogoutResponse{
		Message: "Logged out successfully",
	})
}

// AdminLogin выполняет вход администратора
// @Summary Вход администратора
// @Description Аутентификация администратора и выдача JWT токенов
// @Tags admin
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "Данные для входа"
// @Success 200 {object} models.LoginResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Router /auth/admin/login [post]
func (h *AuthHandler) AdminLogin(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Получаем администратора
	admin, err := h.repo.GetAdministratorByLogin(c.Request.Context(), req.Login)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid login or password",
		})
		return
	}

	// Проверяем пароль
	if !utils.CheckPasswordHash(req.Password, admin.Password) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "Invalid login or password",
		})
		return
	}

	// Генерируем токены
	accessToken, err := utils.GenerateAccessToken(h.cfg, admin.ID, "admin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate access token",
		})
		return
	}

	refreshToken, expiresAt, err := utils.GenerateRefreshToken(h.cfg, admin.ID, "admin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate refresh token",
		})
		return
	}

	// Сохраняем refresh токен в БД
	refreshTokenModel := &models.RefreshToken{
		UserID:    admin.ID,
		Token:     refreshToken,
		ExpiresAt: expiresAt,
		Revoked:   false,
		Role:      "admin",
	}
	if err := h.repo.CreateRefreshToken(c.Request.Context(), refreshTokenModel); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to save refresh token",
		})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    h.cfg.JWTAccessExpiration,
		Admin: &models.AdminInfo{
			ID:    admin.ID,
			Login: admin.Login,
		},
	})
}

// AdminRegister регистрирует нового администратора
// @Summary Регистрация администратора
// @Description Регистрация нового администратора в системе
// @Tags admin
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "Данные для регистрации"
// @Success 201 {object} models.RegisterResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Router /auth/admin/register [post]
func (h *AuthHandler) AdminRegister(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Простая валидация пароля (минимум 8 символов)
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "validation_error",
			Message: "password must be at least 8 characters",
		})
		return
	}

	// Хешируем пароль
	hashedPassword, err := utils.HashPassword(req.Password, h.cfg.BcryptCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to hash password",
		})
		return
	}

	// Создаем администратора
	admin := &models.Administrator{
		Login:    req.Login,
		Password: hashedPassword,
	}

	if err := h.repo.CreateAdministrator(c.Request.Context(), admin); err != nil {
		if contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, models.ErrorResponse{
				Error:   "conflict",
				Message: "Administrator with this login already exists",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create administrator",
		})
		return
	}

	c.JSON(http.StatusCreated, models.RegisterResponse{
		ID:      admin.ID,
		Login:   admin.Login,
		Message: "Administrator created successfully",
	})
}

// Validate валидирует JWT токен (для внутреннего использования микросервисами)
// @Summary Валидация токена
// @Description Валидация JWT токена (используется другими микросервисами)
// @Tags internal
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.ValidateResponse
// @Failure 401 {object} models.ValidateResponse
// @Router /auth/validate [post]
func (h *AuthHandler) Validate(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	tokenString, err := utils.ExtractTokenFromHeader(authHeader)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ValidateResponse{
			Valid: false,
			Error: "Authorization header is required",
		})
		return
	}

	// Валидируем токен
	claims, err := utils.ValidateToken(h.cfg, tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ValidateResponse{
			Valid: false,
			Error: err.Error(),
		})
		return
	}

	// Проверяем, что это не refresh токен
	if claims.Type == "refresh" {
		c.JSON(http.StatusUnauthorized, models.ValidateResponse{
			Valid: false,
			Error: "Refresh token cannot be used for authentication",
		})
		return
	}

	// Возвращаем информацию о токене
	expiresAt := ""
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time.Format(time.RFC3339)
	}

	c.JSON(http.StatusOK, models.ValidateResponse{
		Valid:     true,
		UserID:    &claims.UserID,
		Role:      claims.Role,
		ExpiresAt: expiresAt,
	})
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(len(substr) == 0 ||
			(len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					containsMiddle(s, substr))))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
