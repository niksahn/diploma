package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diploma/workspace-service/config"
	"github.com/diploma/workspace-service/data/database"
	"github.com/diploma/workspace-service/data/repository"
	"github.com/diploma/workspace-service/docs"
	"github.com/diploma/workspace-service/presentation/handlers"
	metrics "github.com/diploma/shared/metrics"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Workspace Service API
// @version 1.0.0
// @description Микросервис управления рабочими пространствами для корпоративного мессенджера
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@messenger.local

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8083
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

	// Создаем обработчики
	workspaceHandler := handlers.NewWorkspaceHandler(repo)
	tariffHandler := handlers.NewTariffHandler(repo)

	// Создаем метрики
	serviceMetrics := metrics.NewServiceMetrics("workspace-service")

	// Настраиваем роутер
	router := setupRouter(workspaceHandler, tariffHandler, serviceMetrics)

	// Создаем HTTP сервер
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Запускаем сервер в горутине
	go func() {
		log.Printf("Workspace Service starting on port %s", cfg.Port)
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

func setupRouter(workspaceHandler *handlers.WorkspaceHandler, tariffHandler *handlers.TariffHandler, serviceMetrics *metrics.ServiceMetrics) *gin.Engine {
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
	api := router.Group("/api/v1/workspaces")
	{
		// Тарифы (публичный эндпоинт и админские)
		api.GET("/tariffs", tariffHandler.GetTariffs)
		api.POST("/tariffs", tariffHandler.CreateTariff)
		api.PUT("/tariffs/:id", tariffHandler.UpdateTariff)

		// Рабочие пространства
		api.POST("", workspaceHandler.CreateWorkspace)
		api.GET("", workspaceHandler.GetUserWorkspaces)
		api.GET("/:id", workspaceHandler.GetWorkspace)
		api.GET("/all", workspaceHandler.GetAllWorkspaces)
		api.PUT("/:id", workspaceHandler.UpdateWorkspace)
		api.DELETE("/:id", workspaceHandler.DeleteWorkspace)

		// Участники рабочего пространства
		api.POST("/:id/members", workspaceHandler.AddMember)
		api.GET("/:id/members", workspaceHandler.GetMembers)
		api.PUT("/:id/members/:user_id", workspaceHandler.UpdateMemberRole)
		api.DELETE("/:id/members/:user_id", workspaceHandler.RemoveMember)

		// Смена руководителя
		api.PUT("/:id/leader", workspaceHandler.ChangeLeader)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "workspace-service"})
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
