package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/diploma/chat-service/data/repository"
	"github.com/diploma/chat-service/presentation/models"
	"github.com/gin-gonic/gin"
)

type ChatHandler struct {
	repo *repository.Repository
}

func NewChatHandler(repo *repository.Repository) *ChatHandler {
	return &ChatHandler{repo: repo}
}

// getUserIDFromHeader извлекает userID из заголовка
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

// CreateChat создает новый чат
// @Summary Создать новый чат
// @Description Создает новый чат в рабочем пространстве
// @Tags chats
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.CreateChatRequest true "Данные для создания чата"
// @Success 201 {object} models.ChatResponse
// @Failure 400 {object} map[string]string "Невалидные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является участником РП"
// @Failure 404 {object} map[string]string "РП не найдено"
// @Router /chats [post]
func (h *ChatHandler) CreateChat(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	var req models.CreateChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Валидация типа чата
	if req.Type < 1 || req.Type > 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chat type (must be 1, 2, or 3)"})
		return
	}

	// Для личного чата должно быть ровно 2 участника
	if req.Type == 1 && len(req.Members) != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "personal chat must have exactly 2 members"})
		return
	}

	// Проверяем, что создатель в списке участников
	creatorInMembers := false
	for _, memberID := range req.Members {
		if memberID == userID {
			creatorInMembers = true
			break
		}
	}
	if !creatorInMembers {
		req.Members = append(req.Members, userID)
	}

	// Проверяем, является ли пользователь участником РП
	isMember, err := h.repo.IsUserInWorkspace(c.Request.Context(), userID, req.WorkspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check workspace membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "user is not a member of this workspace"})
		return
	}

	// Проверяем, что все участники из того же РП
	for _, memberID := range req.Members {
		isMember, err := h.repo.IsUserInWorkspace(c.Request.Context(), memberID, req.WorkspaceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check workspace membership"})
			return
		}
		if !isMember {
			c.JSON(http.StatusForbidden, gin.H{"error": "some users are not members of this workspace"})
			return
		}
	}

	// Создаем чат
	chat, err := h.repo.CreateChat(c.Request.Context(), req.Name, req.Type, req.WorkspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Добавляем участников (создатель получает роль администратора)
	for _, memberID := range req.Members {
		role := 1 // участник
		if memberID == userID {
			role = 2 // администратор для создателя
		}
		if err := h.repo.AddUserToChat(c.Request.Context(), chat.ID, memberID, role); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add member to chat"})
			return
		}
	}

	response := models.ChatResponse{
		ID:           chat.ID,
		Name:         chat.Name,
		Type:         chat.Type,
		WorkspaceID:  chat.WorkspaceID,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
		MembersCount: len(req.Members),
	}

	c.JSON(http.StatusCreated, response)
}

// GetChats получает список чатов пользователя
// @Summary Получить список чатов пользователя
// @Description Возвращает список всех чатов, в которых участвует пользователь
// @Tags chats
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspace_id query int false "Фильтр по рабочему пространству"
// @Param type query int false "Фильтр по типу чата (1=личный, 2=групповой, 3=канал)"
// @Success 200 {object} models.ChatListResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Router /chats [get]
func (h *ChatHandler) GetChats(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	var workspaceID *int
	if workspaceIDStr := c.Query("workspace_id"); workspaceIDStr != "" {
		if id, err := strconv.Atoi(workspaceIDStr); err == nil {
			workspaceID = &id
		}
	}

	var chatType *int
	if typeStr := c.Query("type"); typeStr != "" {
		if t, err := strconv.Atoi(typeStr); err == nil && t >= 1 && t <= 3 {
			chatType = &t
		}
	}

	chats, err := h.repo.GetUserChats(c.Request.Context(), userID, workspaceID, chatType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var chatList []models.ChatListItem
	for _, chat := range chats {
		// Получаем последнее сообщение
		lastMsg, _ := h.repo.GetLastMessage(c.Request.Context(), chat.ID)

		// Считаем непрочитанные сообщения
		unreadCount, _ := h.repo.CountUnreadMessages(c.Request.Context(), chat.ID, userID)

		// Считаем участников
		members, _ := h.repo.GetChatMembers(c.Request.Context(), chat.ID)

		item := models.ChatListItem{
			ID:           chat.ID,
			Name:         chat.Name,
			Type:         chat.Type,
			WorkspaceID:  chat.WorkspaceID,
			UnreadCount:  unreadCount,
			MembersCount: len(members),
		}

		if lastMsg != nil {
			item.LastMessage = &models.LastMessageInfo{
				Text:     lastMsg.Text,
				Date:     lastMsg.Date,
				UserName: lastMsg.UserName,
			}
		}

		chatList = append(chatList, item)
	}

	c.JSON(http.StatusOK, models.ChatListResponse{
		Chats: chatList,
		Total: len(chatList),
	})
}

// GetChat получает информацию о чате
// @Summary Получить информацию о чате
// @Description Возвращает детальную информацию о чате
// @Tags chats
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Success 200 {object} models.ChatResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является участником чата"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id} [get]
func (h *ChatHandler) GetChat(c *gin.Context) {
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

	// Получаем роль пользователя
	role, _ := h.repo.GetUserRoleInChat(c.Request.Context(), userID, chatID)

	// Считаем участников
	members, _ := h.repo.GetChatMembers(c.Request.Context(), chatID)

	response := models.ChatResponse{
		ID:           chat.ID,
		Name:         chat.Name,
		Type:         chat.Type,
		WorkspaceID:  chat.WorkspaceID,
		MembersCount: len(members),
		MyRole:       role,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateChat обновляет настройки чата
// @Summary Обновить настройки чата
// @Description Обновляет название и другие настройки чата (только для администраторов)
// @Tags chats
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param request body models.UpdateChatRequest true "Данные для обновления чата"
// @Success 200 {object} models.ChatResponse
// @Failure 400 {object} map[string]string "Невалидные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Недостаточно прав"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id} [put]
func (h *ChatHandler) UpdateChat(c *gin.Context) {
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

	// Личные чаты нельзя переименовать
	if chat.Type == 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "personal chats cannot be renamed"})
		return
	}

	// Проверяем права (должен быть администратором)
	role, err := h.repo.GetUserRoleInChat(c.Request.Context(), userID, chatID)
	if err != nil || role != 2 {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	var req models.UpdateChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedChat, err := h.repo.UpdateChat(c.Request.Context(), chatID, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := models.ChatResponse{
		ID:   updatedChat.ID,
		Name: updatedChat.Name,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteChat удаляет чат
// @Summary Удалить чат
// @Description Удаляет чат и все связанные данные (только для администраторов)
// @Tags chats
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Success 204 "No Content"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Недостаточно прав"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id} [delete]
func (h *ChatHandler) DeleteChat(c *gin.Context) {
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

	// Проверяем права (должен быть администратором)
	role, err := h.repo.GetUserRoleInChat(c.Request.Context(), userID, chatID)
	if err != nil || role != 2 {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	if err := h.repo.DeleteChat(c.Request.Context(), chatID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}










