# Shared Metrics Module

Общий модуль для сбора метрик микросервисов с использованием Prometheus.

## Использование

### 1. Добавление в сервис

```go
import (
    "github.com/diploma/shared/metrics"
    "github.com/gin-gonic/gin"
)

func main() {
    // Создаем метрики для сервиса
    serviceMetrics := metrics.NewServiceMetrics("auth-service")

    // Настраиваем роутер
    router := gin.Default()

    // Добавляем middleware для сбора HTTP метрик
    router.Use(serviceMetrics.Middleware())

    // Добавляем эндпоинт /metrics для экспозиции метрик
    router.GET("/metrics", serviceMetrics.Handler())

    // ... остальные маршруты
}
```

### 2. Доступные метрики

#### HTTP Метрики
- `http_request_duration_seconds` - Гистограмма длительности HTTP запросов
- `http_requests_total` - Счетчик общего количества HTTP запросов
- `http_response_size_bytes` - Гистограмма размера HTTP ответов

Все HTTP метрики имеют лейблы:
- `method` - HTTP метод (GET, POST, etc.)
- `endpoint` - нормализованный путь эндпоинта
- `status` - HTTP статус код

#### Системные метрики
- `go_goroutines_total` - Количество активных горутин
- `go_gc_duration_seconds` - Время, потраченное на сборку мусора (экспортируется стандартным Go collector Prometheus, не регистрируем вручную, чтобы избежать конфликтов)
- `go_memory_used_bytes` - Используемая память

## Нормализация путей

Модуль автоматически нормализует пути эндпоинтов для лучшей группировки метрик:
- `/api/v1/users/123` → `/api/v1/users/:id`
- `/api/v1/chats/456/messages` → `/api/v1/chats/:id/messages`
