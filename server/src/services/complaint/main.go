package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diploma/complaint-service/config"
	"github.com/diploma/complaint-service/data/database"
	"github.com/diploma/complaint-service/data/repository"
	"github.com/diploma/complaint-service/docs"
	"github.com/diploma/complaint-service/presentation/handlers"
	metrics "github.com/diploma/shared/metrics"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Complaint Service API
// @version 1.0.0
// @description Микросервис обработки жалоб пользователей для корпоративного мессенджера
// @termsOfService http://swagger.io/terms/
// @contact.name API Support
// @contact.email support@messenger.local
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html
// @host localhost:8086
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT токен в формате: Bearer {token}. Gateway проверяет токен и добавляет X-User-ID в заголовок
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.NewDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	repo := repository.NewRepository(db)
	handler := handlers.NewComplaintHandler(repo)

	// Создаем метрики
	serviceMetrics := metrics.NewServiceMetrics("complaint-service")

	router := setupRouter(handler, serviceMetrics)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		log.Printf("Complaint Service starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

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

func setupRouter(handler *handlers.ComplaintHandler, serviceMetrics *metrics.ServiceMetrics) *gin.Engine {
	router := gin.Default()

	docs.SwaggerInfo.BasePath = "/api/v1"
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(serviceMetrics.Middleware())

	// Metrics endpoint
	router.GET("/metrics", serviceMetrics.Handler())

	api := router.Group("/api/v1/complaints")
	{
		api.POST("", handler.CreateComplaint)
		api.GET("", handler.ListComplaints)
		api.GET("/:id", handler.GetComplaint)
		api.PUT("/:id/status", handler.UpdateComplaintStatus)
		api.DELETE("/:id", handler.DeleteComplaint)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "complaint-service"})
	})

	return router
}
