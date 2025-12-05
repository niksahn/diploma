package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diploma/chat-service/config"
	"github.com/diploma/chat-service/data/database"
	"github.com/diploma/chat-service/data/repository"
	"github.com/diploma/chat-service/docs"
	"github.com/diploma/chat-service/presentation/handlers"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Chat Service API
// @version 1.0.0
// @description Микросервис управления чатами и сообщениями для корпоративного мессенджера
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@messenger.local

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8084
// @BasePath /api/v1/chats

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT токен в формате: Bearer {token}. Gateway проверяет токен и добавляет X-User-ID в заголовок

func main() {
	// Загружаем конфигурацию
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Подключаемся к БД
	db, err := database.NewDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Создаем репозиторий
	repo := repository.NewRepository(db)

	// Создаем обработчики
	chatHandler := handlers.NewChatHandler(repo)
	memberHandler := handlers.NewMemberHandler(repo)
	messageHandler := handlers.NewMessageHandler(repo)

	// Создаем WebSocket Hub
	wsHub := handlers.NewWSHub(repo)
	go wsHub.Run()

	// Настраиваем роутер
	router := setupRouter(chatHandler, memberHandler, messageHandler, wsHub)

	// Создаем HTTP сервер
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Запускаем сервер в горутине
	go func() {
		log.Printf("Chat Service starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func setupRouter(chatHandler *handlers.ChatHandler, memberHandler *handlers.MemberHandler, messageHandler *handlers.MessageHandler, wsHub *handlers.WSHub) *gin.Engine {
	router := gin.Default()

	// Swagger документация
	docs.SwaggerInfo.BasePath = "/api/v1/chats"
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// API routes - регистрируем в правильном порядке: от более специфичных к менее специфичным
	api := router.Group("/api/v1/chats")
	{
		// WebSocket (статический путь - регистрируем первым)
		api.GET("/ws", handlers.HandleWebSocket(wsHub))

		// Чаты (общие маршруты без параметров)
		api.POST("", chatHandler.CreateChat)
		api.GET("", chatHandler.GetChats)

		// ВАЖНО: Регистрируем более специфичные маршруты ПЕРЕД общими /:id
		// Это критично для правильной работы роутера Gin

		// Сообщения с message_id (самые специфичные - регистрируем первыми)
		api.PUT("/:id/messages/:message_id", messageHandler.UpdateMessage)
		api.DELETE("/:id/messages/:message_id", messageHandler.DeleteMessage)

		// Сообщения (менее специфичные)
		api.GET("/:id/messages", messageHandler.GetMessages)
		api.POST("/:id/messages", messageHandler.CreateMessage)
		api.PUT("/:id/messages/read", messageHandler.MarkAsRead)

		// Участники чата
		api.POST("/:id/members", memberHandler.AddMembers)
		api.GET("/:id/members", memberHandler.GetMembers)
		api.PUT("/:id/members/:user_id", memberHandler.UpdateMemberRole)
		api.DELETE("/:id/members/:user_id", memberHandler.RemoveMember)

		// Чаты (общие маршруты с :id - регистрируем ПОСЛЕДНИМИ)
		api.GET("/:id", chatHandler.GetChat)
		api.PUT("/:id", chatHandler.UpdateChat)
		api.DELETE("/:id", chatHandler.DeleteChat)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "chat-service"})
	})

	return router
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-User-ID, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
