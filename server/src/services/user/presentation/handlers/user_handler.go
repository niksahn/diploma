package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/diploma/user-service/data/repository"
	"github.com/diploma/user-service/presentation/models"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	repo *repository.Repository
}

func NewUserHandler(repo *repository.Repository) *UserHandler {
	return &UserHandler{repo: repo}
}

// getUserIDFromHeader извлекает userID из заголовка (устанавливается Gateway после проверки токена)
func getUserIDFromHeader(c *gin.Context) (int, error) {
	userIDStr := c.GetHeader("X-User-ID")
	if userIDStr == "" {
		return 0, gin.Error{Err: nil, Type: gin.ErrorTypePublic, Meta: "user ID not found in header"}
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return 0, gin.Error{Err: err, Type: gin.ErrorTypePublic, Meta: "invalid user ID format"}
	}

	return userID, nil
}

// GetMe получает профиль текущего пользователя
// @Summary Получить профиль текущего пользователя
// @Description Возвращает информацию о текущем авторизованном пользователе
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.UserResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Router /users/me [get]
func (h *UserHandler) GetMe(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	user, err := h.repo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	response := models.UserResponse{
		ID:      user.ID,
		Login:   user.Login,
		Surname: user.Surname,
		Name:    user.Name,
		Status:  user.Status,
	}
	if user.Patronymic != nil {
		response.Patronymic = *user.Patronymic
	}

	c.JSON(http.StatusOK, response)
}

// UpdateMe обновляет профиль текущего пользователя
// @Summary Обновить профиль текущего пользователя
// @Description Обновляет данные профиля текущего авторизованного пользователя
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.UpdateProfileRequest true "Данные для обновления профиля"
// @Success 200 {object} models.UserResponse
// @Failure 400 {object} map[string]string "Невалидные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Router /users/me [put]
func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.repo.UpdateUserProfile(c.Request.Context(), userID, req.Surname, req.Name, req.Patronymic)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	response := models.UserResponse{
		ID:      user.ID,
		Login:   user.Login,
		Surname: user.Surname,
		Name:    user.Name,
		Status:  user.Status,
	}
	if user.Patronymic != nil {
		response.Patronymic = *user.Patronymic
	}

	c.JSON(http.StatusOK, response)
}

// GetUserByID получает профиль пользователя по ID
// @Summary Получить профиль пользователя по ID
// @Description Возвращает информацию о пользователе по его ID
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID пользователя"
// @Success 200 {object} models.UserResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 404 {object} map[string]string "Пользователь не найден"
// @Router /users/{id} [get]
func (h *UserHandler) GetUserByID(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := h.repo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	response := models.UserResponse{
		ID:      user.ID,
		Login:   user.Login,
		Surname: user.Surname,
		Name:    user.Name,
		Status:  user.Status,
	}
	if user.Patronymic != nil {
		response.Patronymic = *user.Patronymic
	}

	c.JSON(http.StatusOK, response)
}

// UpdateUserByID обновляет данные пользователя (только для руководителя РП)
// @Summary Обновить данные пользователя
// @Description Обновляет данные пользователя. Доступно только для руководителя РП, где состоит целевой пользователь
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID пользователя"
// @Param request body models.UpdateProfileRequest true "Данные для обновления профиля"
// @Success 200 {object} models.UserResponse
// @Failure 400 {object} map[string]string "Невалидные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Недостаточно прав"
// @Failure 404 {object} map[string]string "Пользователь не найден"
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUserByID(c *gin.Context) {
	leaderID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	userIDStr := c.Param("id")
	targetUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Проверяем, является ли текущий пользователь руководителем РП, где состоит целевой пользователь
	isLeader, err := h.repo.IsWorkspaceLeader(c.Request.Context(), leaderID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check permissions"})
		return
	}

	if !isLeader {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.repo.UpdateUserProfile(c.Request.Context(), targetUserID, req.Surname, req.Name, req.Patronymic)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	response := models.UserResponse{
		ID:      user.ID,
		Login:   user.Login,
		Surname: user.Surname,
		Name:    user.Name,
		Status:  user.Status,
	}
	if user.Patronymic != nil {
		response.Patronymic = *user.Patronymic
	}

	c.JSON(http.StatusOK, response)
}

// UpdateStatus обновляет статус текущего пользователя
// @Summary Обновить статус текущего пользователя
// @Description Обновляет статус текущего авторизованного пользователя (1=Онлайн, 2=Не беспокоить, 3=Отошел, 4=Офлайн)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.UpdateStatusRequest true "Новый статус"
// @Success 200 {object} models.UpdateStatusResponse
// @Failure 400 {object} map[string]string "Невалидный статус"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Router /users/me/status [put]
func (h *UserHandler) UpdateStatus(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	var req models.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status < 1 || req.Status > 4 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be between 1 and 4"})
		return
	}

	if err := h.repo.UpdateUserStatus(c.Request.Context(), userID, req.Status); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	response := models.UpdateStatusResponse{
		ID:        userID,
		Status:    req.Status,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}

// SearchUsers выполняет поиск пользователей с фильтрацией
// @Summary Поиск пользователей
// @Description Выполняет поиск пользователей с фильтрацией по поисковой строке, рабочему пространству и статусу
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param search query string false "Строка поиска (по login, surname, name)"
// @Param workspace_id query int false "Фильтр по рабочему пространству"
// @Param status query int false "Фильтр по статусу (1-4)"
// @Param limit query int false "Лимит результатов (по умолчанию 50, макс 100)" default(50)
// @Param offset query int false "Смещение для пагинации" default(0)
// @Success 200 {object} models.SearchUsersResponse
// @Failure 400 {object} map[string]string "Невалидные параметры"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Router /users [get]
func (h *UserHandler) SearchUsers(c *gin.Context) {
	search := c.Query("search")
	
	var workspaceID *int
	if workspaceIDStr := c.Query("workspace_id"); workspaceIDStr != "" {
		if id, err := strconv.Atoi(workspaceIDStr); err == nil {
			workspaceID = &id
		}
	}

	var status *int
	if statusStr := c.Query("status"); statusStr != "" {
		if s, err := strconv.Atoi(statusStr); err == nil && s >= 1 && s <= 4 {
			status = &s
		}
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	users, total, err := h.repo.SearchUsers(c.Request.Context(), search, workspaceID, status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var userResponses []models.UserResponse
	for _, user := range users {
		response := models.UserResponse{
			ID:      user.ID,
			Login:   user.Login,
			Surname: user.Surname,
			Name:    user.Name,
			Status:  user.Status,
		}
		if user.Patronymic != nil {
			response.Patronymic = *user.Patronymic
		}
		userResponses = append(userResponses, response)
	}

	c.JSON(http.StatusOK, models.SearchUsersResponse{
		Users:  userResponses,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// GetUsersByWorkspace получает всех пользователей рабочего пространства
// @Summary Получить пользователей рабочего пространства
// @Description Возвращает список всех пользователей указанного рабочего пространства с их ролями
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspace_id path int true "ID рабочего пространства"
// @Success 200 {object} models.WorkspaceUsersResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является участником этого РП"
// @Failure 404 {object} map[string]string "Рабочее пространство не найдено"
// @Router /users/workspace/{workspace_id} [get]
func (h *UserHandler) GetUsersByWorkspace(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		fmt.Printf("GetUsersByWorkspace: failed to get user ID from header: %v\n", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	fmt.Printf("GetUsersByWorkspace: userID=%d\n", userID)

	workspaceIDStr := c.Param("workspace_id")
	workspaceID, err := strconv.Atoi(workspaceIDStr)
	if err != nil {
		fmt.Printf("GetUsersByWorkspace: invalid workspace ID: %s\n", workspaceIDStr)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	fmt.Printf("GetUsersByWorkspace: workspaceID=%d\n", workspaceID)

	creatorID, err := h.repo.GetWorkspaceCreator(c.Request.Context(), workspaceID)
	if err != nil {
		if errors.Is(err, repository.ErrWorkspaceNotFound) {
			fmt.Printf("GetUsersByWorkspace: workspace not found\n")
			c.JSON(http.StatusNotFound, gin.H{"error": "workspace not found"})
			return
		}

		fmt.Printf("GetUsersByWorkspace: failed to load workspace: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load workspace"})
		return
	}

	// Проверяем, является ли пользователь участником этого РП или его создателем
	isMember, err := h.repo.IsUserInWorkspace(c.Request.Context(), userID, workspaceID)
	if err != nil {
		fmt.Printf("GetUsersByWorkspace: failed to check workspace membership: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check workspace membership"})
		return
	}

	fmt.Printf("GetUsersByWorkspace: isMember=%v\n", isMember)

	if !isMember && userID != creatorID {
		fmt.Printf("GetUsersByWorkspace: user is not a member\n")
		c.JSON(http.StatusForbidden, gin.H{"error": "user is not a member of this workspace"})
		return
	}

	workspaceUsers, err := h.repo.GetUsersByWorkspace(c.Request.Context(), workspaceID, creatorID)
	if err != nil {
		fmt.Printf("GetUsersByWorkspace: failed to get users by workspace: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("GetUsersByWorkspace: found %d users\n", len(workspaceUsers))

	var userResponses []models.WorkspaceUserResponse
	for _, wu := range workspaceUsers {
		response := models.WorkspaceUserResponse{
			ID:      wu.User.ID,
			Login:   wu.User.Login,
			Surname: wu.User.Surname,
			Name:    wu.User.Name,
			Status:  wu.User.Status,
			Role:    wu.Role,
			JoinedAt: wu.JoinedAt,
		}
		if wu.User.Patronymic != nil {
			response.Patronymic = *wu.User.Patronymic
		}
		userResponses = append(userResponses, response)
	}

	c.JSON(http.StatusOK, models.WorkspaceUsersResponse{
		Users: userResponses,
		Total: len(userResponses),
	})
}





