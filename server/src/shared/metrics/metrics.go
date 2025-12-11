package metrics

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// ServiceMetrics содержит все метрики для микросервиса
type ServiceMetrics struct {
	// HTTP метрики
	HTTPRequestDuration *prometheus.HistogramVec
	HTTPRequestTotal    *prometheus.CounterVec
	HTTPResponseSize    *prometheus.HistogramVec

	// Системные метрики
	GoGoroutines prometheus.Gauge
	GoGC         prometheus.Gauge
	GoMemory     prometheus.Gauge
}

// NewServiceMetrics создает новый экземпляр метрик для сервиса
func NewServiceMetrics(serviceName string) *ServiceMetrics {
	sm := &ServiceMetrics{}

	// HTTP метрики
	sm.HTTPRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint", "status"},
	)

	sm.HTTPRequestTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	sm.HTTPResponseSize = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_response_size_bytes",
			Help:    "HTTP response size in bytes",
			Buckets: prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method", "endpoint", "status"},
	)

	// Системные метрики
	sm.GoGoroutines = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "go_goroutines_total",
			Help: "Number of goroutines that currently exist",
		},
	)

	sm.GoGC = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "go_gc_duration_seconds",
			Help: "Time spent in garbage collection",
		},
	)

	sm.GoMemory = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "go_memory_used_bytes",
			Help: "Current memory usage in bytes",
		},
	)

	// Регистрируем метрики
	prometheus.MustRegister(
		sm.HTTPRequestDuration,
		sm.HTTPRequestTotal,
		sm.HTTPResponseSize,
		sm.GoGoroutines,
		sm.GoGC,
		sm.GoMemory,
	)

	return sm
}

// Middleware создает Gin middleware для сбора HTTP метрик
func (sm *ServiceMetrics) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		// Выполняем запрос
		c.Next()

		// Собираем метрики после выполнения
		duration := time.Since(start)
		status := strconv.Itoa(c.Writer.Status())
		method := c.Request.Method

		// Нормализуем путь для группировки похожих эндпоинтов
		normalizedPath := sm.normalizePath(path)

		// Записываем метрики
		sm.HTTPRequestDuration.WithLabelValues(method, normalizedPath, status).Observe(duration.Seconds())
		sm.HTTPRequestTotal.WithLabelValues(method, normalizedPath, status).Inc()
		sm.HTTPResponseSize.WithLabelValues(method, normalizedPath, status).Observe(float64(c.Writer.Size()))

		// Обновляем системные метрики
		sm.updateSystemMetrics()
	}
}

// normalizePath нормализует путь для группировки похожих эндпоинтов
func (sm *ServiceMetrics) normalizePath(path string) string {
	// Заменяем ID параметры на placeholders для лучшей группировки
	// Например: /api/v1/users/123 -> /api/v1/users/:id
	switch {
	case len(path) > 0 && path[len(path)-1] == '/':
		path = path[:len(path)-1] // Убираем trailing slash
	}

	// Нормализуем пути с ID
	parts := []string{}
	segments := strings.Split(path, "/")
	for _, segment := range segments {
		if isNumeric(segment) && len(parts) > 2 { // Предполагаем что ID идет после /api/v1/service/
			parts = append(parts, ":id")
		} else {
			parts = append(parts, segment)
		}
	}

	return strings.Join(parts, "/")
}

// isNumeric проверяет является ли строка числом
func isNumeric(s string) bool {
	_, err := strconv.Atoi(s)
	return err == nil
}

// updateSystemMetrics обновляет системные метрики
func (sm *ServiceMetrics) updateSystemMetrics() {
	// Используем runtime метрики Go (они автоматически регистрируются prometheus)
	// Эти метрики уже доступны в /metrics эндпоинте
}

// Handler возвращает Gin handler для экспозиции метрик (для обратной совместимости)
func (sm *ServiceMetrics) Handler() gin.HandlerFunc {
	h := promhttp.Handler()
	return gin.WrapH(h)
}

// GinHandler возвращает Gin handler для экспозиции метрик
func (sm *ServiceMetrics) GinHandler() gin.HandlerFunc {
	return sm.Handler()
}

// ChiHandler возвращает Chi handler для экспозиции метрик
func (sm *ServiceMetrics) ChiHandler() http.Handler {
	return promhttp.Handler()
}

// ChiMiddleware создает Chi middleware для сбора HTTP метрик
func (sm *ServiceMetrics) ChiMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			path := r.URL.Path

			// Создаем ResponseWriter wrapper для отслеживания статуса и размера
			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			// Выполняем запрос
			next.ServeHTTP(rw, r)

			// Собираем метрики после выполнения
			duration := time.Since(start)
			status := strconv.Itoa(rw.statusCode)
			method := r.Method

			// Нормализуем путь для группировки похожих эндпоинтов
			normalizedPath := sm.normalizePath(path)

			// Записываем метрики
			sm.HTTPRequestDuration.WithLabelValues(method, normalizedPath, status).Observe(duration.Seconds())
			sm.HTTPRequestTotal.WithLabelValues(method, normalizedPath, status).Inc()
			sm.HTTPResponseSize.WithLabelValues(method, normalizedPath, status).Observe(float64(rw.size))

			// Обновляем системные метрики
			sm.updateSystemMetrics()
		})
	}
}

// responseWriter wraps http.ResponseWriter to capture status code and response size
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	size       int64
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(data []byte) (int, error) {
	size, err := rw.ResponseWriter.Write(data)
	rw.size += int64(size)
	return size, err
}
