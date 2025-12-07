package handlers

import (
	"net/http"
	"strconv"

	"github.com/diploma/chat-service/data/repository"
	"github.com/diploma/chat-service/presentation/models"
	"github.com/gin-gonic/gin"
)

type MemberHandler struct {
	repo *repository.Repository
}

func NewMemberHandler(repo *repository.Repository) *MemberHandler {
	return &MemberHandler{repo: repo}
}

// AddMembers добавляет участников в чат
// @Summary Добавить участников в чат
// @Description Добавляет новых участников в групповой чат или канал
// @Tags chat-members
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param request body models.AddMembersRequest true "Данные для добавления участников"
// @Success 201 {object} models.AddMembersResponse
// @Failure 400 {object} map[string]string "Невалидные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Недостаточно прав"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id}/members [post]
func (h *MemberHandler) AddMembers(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	chatIDStr := c.Param("id")
	chatID, err := strconv.Atoi(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chat ID"})
		return
	}

	chat, err := h.repo.GetChatByID(c.Request.Context(), chatID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "chat not found"})
		return
	}

	// Нельзя добавить участников в личный чат
	if chat.Type == 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot add members to personal chat"})
		return
	}

	// Проверяем права (должен быть администратором)
	role, err := h.repo.GetUserRoleInChat(c.Request.Context(), userID, chatID)
	if err != nil || role != 2 {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	var req models.AddMembersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем, что все пользователи из того же РП
	for _, memberID := range req.UserIDs {
		isMember, err := h.repo.IsUserInWorkspace(c.Request.Context(), memberID, chat.WorkspaceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check workspace membership"})
			return
		}
		if !isMember {
			c.JSON(http.StatusForbidden, gin.H{"error": "some users are not members of this workspace"})
			return
		}
	}

	// Добавляем участников
	var added []int
	for _, memberID := range req.UserIDs {
		// Проверяем, не является ли пользователь уже участником
		isMember, _ := h.repo.IsUserInChat(c.Request.Context(), memberID, chatID)
		if !isMember {
			if err := h.repo.AddUserToChat(c.Request.Context(), chatID, memberID, req.Role); err == nil {
				added = append(added, memberID)
			}
		}
	}

	response := models.AddMembersResponse{
		Added:  added,
		ChatID: chatID,
	}

	c.JSON(http.StatusCreated, response)
}

// GetMembers получает список участников чата
// @Summary Получить список участников чата
// @Description Возвращает список всех участников чата
// @Tags chat-members
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Success 200 {object} models.ChatMembersResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является участником чата"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id}/members [get]
func (h *MemberHandler) GetMembers(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	chatIDStr := c.Param("id")
	chatID, err := strconv.Atoi(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chat ID"})
		return
	}

	// Проверяем, является ли пользователь участником чата
	isMember, err := h.repo.IsUserInChat(c.Request.Context(), userID, chatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check chat membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "user is not a member of this chat"})
		return
	}

	members, err := h.repo.GetChatMembers(c.Request.Context(), chatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var memberResponses []models.ChatMemberResponse
	for _, member := range members {
		response := models.ChatMemberResponse{
			ID:       member.ID,
			UserID:   member.UserID,
			Login:    member.Login,
			Name:     member.Name,
			Surname:  member.Surname,
			Role:     member.Role,
			Status:   member.Status,
			JoinedAt: member.JoinedAt,
		}
		if member.Patronymic != nil {
			response.Patronymic = *member.Patronymic
		}
		memberResponses = append(memberResponses, response)
	}

	c.JSON(http.StatusOK, models.ChatMembersResponse{
		Members: memberResponses,
		Total:   len(memberResponses),
	})
}

// UpdateMemberRole изменяет роль участника чата
// @Summary Изменить роль участника чата
// @Description Изменяет роль участника чата (только для администраторов)
// @Tags chat-members
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param user_id path int true "ID пользователя"
// @Param request body models.UpdateMemberRoleRequest true "Новая роль"
// @Success 200 {object} models.UpdateMemberRoleResponse
// @Failure 400 {object} map[string]string "Невалидная роль"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Недостаточно прав"
// @Failure 404 {object} map[string]string "Чат или участник не найдены"
// @Router /chats/{id}/members/{user_id} [put]
func (h *MemberHandler) UpdateMemberRole(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	chatIDStr := c.Param("id")
	chatID, err := strconv.Atoi(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chat ID"})
		return
	}

	targetUserIDStr := c.Param("user_id")
	targetUserID, err := strconv.Atoi(targetUserIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Проверяем права (должен быть администратором)
	role, err := h.repo.GetUserRoleInChat(c.Request.Context(), userID, chatID)
	if err != nil || role != 2 {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	var req models.UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Role < 1 || req.Role > 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role (must be 1 or 2)"})
		return
	}

	if err := h.repo.UpdateUserRoleInChat(c.Request.Context(), chatID, targetUserID, req.Role); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	response := models.UpdateMemberRoleResponse{
		UserID: targetUserID,
		ChatID: chatID,
		Role:   req.Role,
	}

	c.JSON(http.StatusOK, response)
}

// RemoveMember удаляет участника из чата
// @Summary Удалить участника из чата
// @Description Удаляет участника из группового чата или канала (только для администраторов)
// @Tags chat-members
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param user_id path int true "ID пользователя"
// @Success 204 "No Content"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Недостаточно прав"
// @Failure 404 {object} map[string]string "Чат или участник не найдены"
// @Router /chats/{id}/members/{user_id} [delete]
func (h *MemberHandler) RemoveMember(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	chatIDStr := c.Param("id")
	chatID, err := strconv.Atoi(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chat ID"})
		return
	}

	targetUserIDStr := c.Param("user_id")
	targetUserID, err := strconv.Atoi(targetUserIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Проверяем права (должен быть администратором)
	role, err := h.repo.GetUserRoleInChat(c.Request.Context(), userID, chatID)
	if err != nil || role != 2 {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	// Проверяем, что не удаляем последнего администратора
	adminCount, err := h.repo.CountAdminsInChat(c.Request.Context(), chatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count admins"})
		return
	}

	targetRole, _ := h.repo.GetUserRoleInChat(c.Request.Context(), targetUserID, chatID)
	if targetRole == 2 && adminCount <= 1 {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot remove last admin"})
		return
	}

	if err := h.repo.RemoveUserFromChat(c.Request.Context(), chatID, targetUserID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}










