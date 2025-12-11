package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diploma/user-service/config"
	"github.com/diploma/user-service/data/database"
	"github.com/diploma/user-service/docs"
	"github.com/diploma/user-service/presentation/handlers"
	"github.com/diploma/user-service/data/repository"
	metrics "github.com/diploma/shared/metrics"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title User Service API
// @version 1.0.0
// @description Микросервис управления пользователями для корпоративного мессенджера
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@messenger.local

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8082
// @BasePath /api/v1

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
	userHandler := handlers.NewUserHandler(repo)

	// Создаем метрики
	serviceMetrics := metrics.NewServiceMetrics("user-service")

	// Настраиваем роутер
	router := setupRouter(userHandler, serviceMetrics)

	// Создаем HTTP сервер
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Запускаем сервер в горутине
	go func() {
		log.Printf("User Service starting on port %s", cfg.Port)
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

func setupRouter(userHandler *handlers.UserHandler, serviceMetrics *metrics.ServiceMetrics) *gin.Engine {
	router := gin.Default()

	// Swagger документация
	docs.SwaggerInfo.BasePath = "/api/v1"
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())
	router.Use(serviceMetrics.Middleware())

	// Metrics endpoint
	router.GET("/metrics", serviceMetrics.Handler())

	// API routes
	api := router.Group("/api/v1/users")
	{
		// Профиль текущего пользователя
		api.GET("/me", userHandler.GetMe)
		api.PUT("/me", userHandler.UpdateMe)
		api.PUT("/me/status", userHandler.UpdateStatus)

		// Поиск и список (должны быть перед /:id, чтобы избежать конфликтов)
		api.GET("/workspace/:workspace_id", userHandler.GetUsersByWorkspace)
		api.GET("", userHandler.SearchUsers)

		// Профиль пользователя по ID (должен быть последним из-за параметра :id)
		api.GET("/:id", userHandler.GetUserByID)
		api.PUT("/:id", userHandler.UpdateUserByID)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "user-service"})
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

