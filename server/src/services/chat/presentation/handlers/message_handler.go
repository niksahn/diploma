package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/diploma/chat-service/data/repository"
	"github.com/diploma/chat-service/presentation/models"
	"github.com/gin-gonic/gin"
)

type MessageHandler struct {
	repo *repository.Repository
}

func NewMessageHandler(repo *repository.Repository) *MessageHandler {
	return &MessageHandler{repo: repo}
}

// GetMessages получает историю сообщений чата
// @Summary Получить историю сообщений чата
// @Description Возвращает историю сообщений чата с пагинацией
// @Tags messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param limit query int false "Лимит сообщений (по умолчанию 50, макс 100)" default(50)
// @Param offset query int false "Смещение для пагинации" default(0)
// @Param before query int false "Получить сообщения до указанной даты (timestamp)"
// @Success 200 {object} models.MessagesResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является участником чата"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id}/messages [get]
func (h *MessageHandler) GetMessages(c *gin.Context) {
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
	log.Printf("HTTP GetMessages: checking membership for user %d in chat %d", userID, chatID)
	isMember, err := h.repo.IsUserInChat(c.Request.Context(), userID, chatID)
	log.Printf("HTTP GetMessages: IsUserInChat returned isMember=%v, err=%v", isMember, err)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check chat membership"})
		return
	}
	if !isMember {
		log.Printf("HTTP GetMessages: user %d is not member of chat %d", userID, chatID)
		c.JSON(http.StatusForbidden, gin.H{"error": "user is not a member of this chat"})
		return
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

	var before *int
	if beforeStr := c.Query("before"); beforeStr != "" {
		if b, err := strconv.Atoi(beforeStr); err == nil {
			before = &b
		}
	}

	messages, err := h.repo.GetChatMessages(c.Request.Context(), chatID, limit+1, offset, before)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit]
	}

	var messageResponses []models.MessageResponse
	for _, msg := range messages {
		// Определяем статус сообщения для текущего пользователя
		status := "sent"
		// Здесь можно добавить логику проверки статуса из JSON

		response := models.MessageResponse{
			ID:       msg.ID,
			ChatID:   msg.ChatID,
			UserID:   msg.UserID,
			UserName: msg.UserName,
			Text:     msg.Text,
			Date:     msg.Date,
			Status:   status,
			Edited:   false, // TODO: добавить поле edited в БД
		}
		messageResponses = append(messageResponses, response)
	}

	c.JSON(http.StatusOK, models.MessagesResponse{
		Messages: messageResponses,
		HasMore:  hasMore,
		Total:    len(messageResponses),
	})
}

// CreateMessage создает новое сообщение
// @Summary Отправить сообщение в чат
// @Description Создает новое сообщение в чате (альтернатива WebSocket)
// @Tags messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param request body models.CreateMessageRequest true "Текст сообщения"
// @Success 201 {object} models.MessageResponse
// @Failure 400 {object} map[string]string "Невалидные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является участником чата"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id}/messages [post]
func (h *MessageHandler) CreateMessage(c *gin.Context) {
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
	log.Printf("HTTP GetMessages: checking membership for user %d in chat %d", userID, chatID)
	isMember, err := h.repo.IsUserInChat(c.Request.Context(), userID, chatID)
	log.Printf("HTTP GetMessages: IsUserInChat returned isMember=%v, err=%v", isMember, err)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check chat membership"})
		return
	}
	if !isMember {
		log.Printf("HTTP GetMessages: user %d is not member of chat %d", userID, chatID)
		c.JSON(http.StatusForbidden, gin.H{"error": "user is not a member of this chat"})
		return
	}

	// Для каналов только администраторы могут писать
	if chat.Type == 3 {
		role, _ := h.repo.GetUserRoleInChat(c.Request.Context(), userID, chatID)
		if role != 2 {
			c.JSON(http.StatusForbidden, gin.H{"error": "only admins can write in channels"})
			return
		}
	}

	var req models.CreateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message, err := h.repo.CreateMessage(c.Request.Context(), chatID, userID, req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Получаем имя пользователя
	// TODO: можно получить из User Service или кэшировать

	response := models.MessageResponse{
		ID:       message.ID,
		ChatID:   message.ChatID,
		UserID:   message.UserID,
		UserName: "User", // TODO: получить реальное имя
		Text:     message.Text,
		Date:     message.Date,
		Status:   "sent",
		Edited:   false,
	}

	c.JSON(http.StatusCreated, response)
}

// UpdateMessage редактирует сообщение
// @Summary Редактировать сообщение
// @Description Обновляет текст сообщения (только автор сообщения)
// @Tags messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param message_id path int true "ID сообщения"
// @Param request body models.UpdateMessageRequest true "Новый текст сообщения"
// @Success 200 {object} models.UpdateMessageResponse
// @Failure 400 {object} map[string]string "Невалидные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является автором сообщения"
// @Failure 404 {object} map[string]string "Сообщение не найдено"
// @Router /chats/{id}/messages/{message_id} [put]
func (h *MessageHandler) UpdateMessage(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	messageIDStr := c.Param("message_id")
	messageID, err := strconv.Atoi(messageIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message ID"})
		return
	}

	message, err := h.repo.GetMessageByID(c.Request.Context(), messageID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		return
	}

	// Проверяем, является ли пользователь автором сообщения
	if message.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "user is not the author of this message"})
		return
	}

	var req models.UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedMessage, err := h.repo.UpdateMessage(c.Request.Context(), messageID, req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := models.UpdateMessageResponse{
		ID:       updatedMessage.ID,
		ChatID:   updatedMessage.ChatID,
		Text:     updatedMessage.Text,
		Edited:   true,
		EditedAt: time.Now().UTC().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}

// DeleteMessage удаляет сообщение
// @Summary Удалить сообщение
// @Description Удаляет сообщение (автор или администратор чата)
// @Tags messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param message_id path int true "ID сообщения"
// @Success 204 "No Content"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Недостаточно прав"
// @Failure 404 {object} map[string]string "Сообщение не найдено"
// @Router /chats/{id}/messages/{message_id} [delete]
func (h *MessageHandler) DeleteMessage(c *gin.Context) {
	userID, err := getUserIDFromHeader(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
		return
	}

	messageIDStr := c.Param("message_id")
	messageID, err := strconv.Atoi(messageIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message ID"})
		return
	}

	message, err := h.repo.GetMessageByID(c.Request.Context(), messageID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		return
	}

	// Проверяем права: автор или администратор чата
	isAuthor := message.UserID == userID
	if !isAuthor {
		role, _ := h.repo.GetUserRoleInChat(c.Request.Context(), userID, message.ChatID)
		if role != 2 {
			c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
	}

	if err := h.repo.DeleteMessage(c.Request.Context(), messageID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// MarkAsRead отмечает сообщения как прочитанные
// @Summary Отметить сообщения как прочитанные
// @Description Отмечает все сообщения до указанного ID как прочитанные
// @Tags messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID чата"
// @Param request body models.MarkAsReadRequest true "ID последнего прочитанного сообщения"
// @Success 200 {object} models.MarkAsReadResponse
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 403 {object} map[string]string "Пользователь не является участником чата"
// @Failure 404 {object} map[string]string "Чат не найден"
// @Router /chats/{id}/messages/read [put]
func (h *MessageHandler) MarkAsRead(c *gin.Context) {
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
	log.Printf("HTTP GetMessages: checking membership for user %d in chat %d", userID, chatID)
	isMember, err := h.repo.IsUserInChat(c.Request.Context(), userID, chatID)
	log.Printf("HTTP GetMessages: IsUserInChat returned isMember=%v, err=%v", isMember, err)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check chat membership"})
		return
	}
	if !isMember {
		log.Printf("HTTP GetMessages: user %d is not member of chat %d", userID, chatID)
		c.JSON(http.StatusForbidden, gin.H{"error": "user is not a member of this chat"})
		return
	}

	var req models.MarkAsReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	marked, err := h.repo.MarkMessagesAsRead(c.Request.Context(), chatID, userID, req.LastMessageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := models.MarkAsReadResponse{
		ChatID:            chatID,
		MarkedAsRead:      marked,
		LastReadMessageID: req.LastMessageID,
	}

	c.JSON(http.StatusOK, response)
}
