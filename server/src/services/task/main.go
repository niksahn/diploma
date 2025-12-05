package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diploma/task-service/config"
	"github.com/diploma/task-service/data/database"
	"github.com/diploma/task-service/data/repository"
	"github.com/diploma/task-service/docs"
	"github.com/diploma/task-service/presentation/handlers"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Task Service API
// @version 1.0.0
// @description Микросервис управления задачами для корпоративного мессенджера
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@messenger.local

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8085
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT токен в формате: Bearer {token}. Gateway проверяет токен и добавляет X-User-ID и X-User-Role в заголовки

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

	// Создаем обработчик
	taskHandler := handlers.NewTaskHandler(repo)

	// Настраиваем роутер
	router := setupRouter(taskHandler)

	// Создаем HTTP сервер
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Запускаем сервер в горутине
	go func() {
		log.Printf("Task Service starting on port %s", cfg.Port)
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

func setupRouter(taskHandler *handlers.TaskHandler) *gin.Engine {
	router := gin.Default()

	// Swagger документация
	docs.SwaggerInfo.BasePath = "/api/v1"
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// API routes
	api := router.Group("/api/v1/tasks")
	{
		// CRUD операции с задачами
		api.POST("", taskHandler.CreateTask)
		api.GET("", taskHandler.GetTasks)
		api.GET("/:id", taskHandler.GetTask)
		api.PUT("/:id", taskHandler.UpdateTask)
		api.DELETE("/:id", taskHandler.DeleteTask)

		// Управление статусом
		api.PUT("/:id/status", taskHandler.UpdateTaskStatus)

		// Управление исполнителями
		api.POST("/:id/assignees", taskHandler.AddTaskAssignees)
		api.GET("/:id/assignees", taskHandler.GetTaskAssignees)
		api.DELETE("/:id/assignees/:user_id", taskHandler.RemoveTaskAssignee)

		// Управление прикреплением к чатам
		api.POST("/:id/chats", taskHandler.AttachTaskToChat)
		api.GET("/:id/chats", taskHandler.GetTaskChats)
		api.DELETE("/:id/chats/:chat_id", taskHandler.DetachTaskFromChat)

		// История изменений
		api.GET("/:id/history", taskHandler.GetTaskHistory)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "task-service"})
	})

	return router
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-User-ID, X-User-Role, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}




