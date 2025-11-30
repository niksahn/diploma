package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/diploma/chat-service/data/repository"
	"github.com/diploma/chat-service/presentation/models"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // В продакшене нужно проверять origin
	},
}

// WSClient представляет клиента WebSocket
type WSClient struct {
	UserID  int
	Conn    *websocket.Conn
	Request *http.Request
	Send    chan models.WSServerMessage
	Hub     *WSHub
	Chats   map[int]bool // Чаты, к которым подключен клиент
	mu      sync.RWMutex
}

// WSHub управляет всеми WebSocket соединениями
type WSHub struct {
	clients    map[*WSClient]bool
	broadcast  chan models.WSServerMessage
	register   chan *WSClient
	unregister chan *WSClient
	repo       *repository.Repository
}

func NewWSHub(repo *repository.Repository) *WSHub {
	return &WSHub{
		clients:    make(map[*WSClient]bool),
		broadcast:  make(chan models.WSServerMessage, 256),
		register:   make(chan *WSClient),
		unregister: make(chan *WSClient),
		repo:       repo,
	}
}

func (h *WSHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Client connected: UserID=%d, Total clients: %d", client.UserID, len(h.clients))

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				log.Printf("Client disconnected: UserID=%d, Total clients: %d", client.UserID, len(h.clients))
			}

		case message := <-h.broadcast:
			// Отправляем сообщение всем клиентам в указанном чате
			for client := range h.clients {
				client.mu.RLock()
				isInChat := client.Chats[message.ChatID]
				client.mu.RUnlock()

				if isInChat {
					select {
					case client.Send <- message:
					default:
						close(client.Send)
						delete(h.clients, client)
					}
				}
			}
		}
	}
}

func (c *WSClient) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, messageBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var clientMsg models.WSClientMessage
		if err := json.Unmarshal(messageBytes, &clientMsg); err != nil {
			c.sendError("INVALID_FORMAT", "Invalid message format")
			continue
		}

		c.handleMessage(clientMsg)
	}
}

func (c *WSClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			jsonData, err := json.Marshal(message)
			if err != nil {
				log.Printf("Error marshaling message: %v", err)
				w.Close()
				continue
			}

			w.Write(jsonData)

			// Отправляем все накопленные сообщения
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				msg := <-c.Send
				jsonData, _ := json.Marshal(msg)
				w.Write(jsonData)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *WSClient) handleMessage(msg models.WSClientMessage) {
	switch msg.Type {
	case "join_chat":
		c.handleJoinChat(msg.ChatID)
	case "leave_chat":
		c.handleLeaveChat(msg.ChatID)
	case "send_message":
		c.handleSendMessage(msg.ChatID, msg.Text)
	case "typing":
		c.handleTyping(msg.ChatID)
	case "stop_typing":
		c.handleStopTyping(msg.ChatID)
	default:
		c.sendError("UNKNOWN_TYPE", "Unknown message type")
	}
}

func (c *WSClient) handleJoinChat(chatID int) {
	// Проверяем, является ли пользователь участником чата
	isMember, err := c.Hub.repo.IsUserInChat(c.Request.Context(), c.UserID, chatID)
	if err != nil || !isMember {
		c.sendError("UNAUTHORIZED", "You are not a member of this chat")
		return
	}

	c.mu.Lock()
	c.Chats[chatID] = true
	c.mu.Unlock()

	// Уведомляем других участников
	c.Hub.broadcast <- models.WSServerMessage{
		Type:     "user_joined",
		ChatID:   chatID,
		UserID:   c.UserID,
		UserName: "User", // TODO: получить реальное имя
	}
}

func (c *WSClient) handleLeaveChat(chatID int) {
	c.mu.Lock()
	delete(c.Chats, chatID)
	c.mu.Unlock()

	// Уведомляем других участников
	c.Hub.broadcast <- models.WSServerMessage{
		Type:   "user_left",
		ChatID: chatID,
		UserID: c.UserID,
	}
}

func (c *WSClient) handleSendMessage(chatID int, text string) {
	// Проверяем, является ли пользователь участником чата
	isMember, err := c.Hub.repo.IsUserInChat(c.Request.Context(), c.UserID, chatID)
	if err != nil || !isMember {
		c.sendError("UNAUTHORIZED", "You are not a member of this chat")
		return
	}

	// Проверяем тип чата (для каналов только админы могут писать)
	chat, err := c.Hub.repo.GetChatByID(c.Request.Context(), chatID)
	if err != nil {
		c.sendError("CHAT_NOT_FOUND", "Chat not found")
		return
	}

	if chat.Type == 3 {
		role, _ := c.Hub.repo.GetUserRoleInChat(c.Request.Context(), c.UserID, chatID)
		if role != 2 {
			c.sendError("FORBIDDEN", "Only admins can write in channels")
			return
		}
	}

	// Создаем сообщение в БД
	message, err := c.Hub.repo.CreateMessage(c.Request.Context(), chatID, c.UserID, text)
	if err != nil {
		c.sendError("INTERNAL_ERROR", "Failed to create message")
		return
	}

	// Отправляем новое сообщение всем участникам чата
	c.Hub.broadcast <- models.WSServerMessage{
		Type: "new_message",
		Message: &models.MessageResponse{
			ID:       message.ID,
			ChatID:   message.ChatID,
			UserID:   message.UserID,
			UserName: "User", // TODO: получить реальное имя
			Text:     message.Text,
			Date:     message.Date,
			Status:   "sent",
			Edited:   false,
		},
	}
}

func (c *WSClient) handleTyping(chatID int) {
	// Проверяем, является ли пользователь участником чата
	isMember, err := c.Hub.repo.IsUserInChat(c.Request.Context(), c.UserID, chatID)
	if err != nil || !isMember {
		return
	}

	// Уведомляем других участников
	c.Hub.broadcast <- models.WSServerMessage{
		Type:     "user_typing",
		ChatID:   chatID,
		UserID:   c.UserID,
		UserName: "User", // TODO: получить реальное имя
	}
}

func (c *WSClient) handleStopTyping(chatID int) {
	// Уведомляем других участников
	c.Hub.broadcast <- models.WSServerMessage{
		Type:   "user_stopped_typing",
		ChatID: chatID,
		UserID: c.UserID,
	}
}

func (c *WSClient) sendError(code, message string) {
	msg := models.WSServerMessage{
		Type: "error",
		Error: &models.WSError{
			Code:    code,
			Message: message,
		},
	}

	select {
	case c.Send <- msg:
	default:
		close(c.Send)
	}
}

// HandleWebSocket обрабатывает WebSocket соединение
// @Summary WebSocket соединение для real-time общения
// @Description Устанавливает WebSocket соединение для обмена сообщениями в реальном времени
// @Tags websocket
// @Param token query string true "JWT токен"
// @Router /chats/ws [get]
func HandleWebSocket(hub *WSHub) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем токен из query параметров
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
			return
		}

		// TODO: Валидация токена через Auth Service
		// Пока используем заголовок X-User-ID, если он есть
		userIDStr := c.GetHeader("X-User-ID")
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found"})
			return
		}

		userID, err := strconv.Atoi(userIDStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user ID"})
			return
		}

		// Обновляем соединение до WebSocket
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade error: %v", err)
			return
		}

		client := &WSClient{
			UserID:  userID,
			Conn:    conn,
			Request: c.Request,
			Send:    make(chan models.WSServerMessage, 256),
			Hub:     hub,
			Chats:   make(map[int]bool),
		}

		client.Hub.register <- client

		// Запускаем горутины для чтения и записи
		go client.writePump()
		go client.readPump()
	}
}
