# API Gateway

**Порт**: `8080`

**Базовый URL**: `http://localhost:8080`

---

## Описание

API Gateway — единая точка входа для всех клиентов (Web, Desktop, Mobile). Обеспечивает маршрутизацию запросов к микросервисам, валидацию JWT токенов, rate limiting и CORS обработку.

---

## Функции

- ✅ Маршрутизация запросов к микросервисам
- ✅ Валидация JWT токенов
- ✅ Rate limiting (защита от DDoS)
- ✅ CORS обработка для веб-клиентов
- ✅ Логирование всех запросов
- ✅ Метрики для мониторинга

---

## Маршрутизация

API Gateway проксирует запросы к соответствующим микросервисам:

```
/api/v1/auth/*       → Auth Service (localhost:8081)
/api/v1/users/*      → User Service (localhost:8082)
/api/v1/workspaces/* → Workspace Service (localhost:8083)
/api/v1/chats/*      → Chat Service (localhost:8084)
/api/v1/tasks/*      → Task Service (localhost:8085)
/api/v1/complaints/* → Complaint Service (localhost:8086)
```

---

## Эндпоинты

### Health Check

#### `GET /health`

Проверка доступности API Gateway и всех микросервисов.

**Описание**: Возвращает статус Gateway и подключенных сервисов.

**Аутентификация**: Не требуется

**Response**: `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "workspace": "healthy",
    "chat": "healthy",
    "task": "healthy",
    "complaint": "healthy"
  },
  "database": "connected"
}
```

**Response при проблемах**: `503 Service Unavailable`

```json
{
  "status": "degraded",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "workspace": "unhealthy",
    "chat": "healthy",
    "task": "healthy",
    "complaint": "healthy"
  },
  "database": "connected"
}
```

---

## Middleware

### 1. JWT Validation Middleware

Проверяет наличие и валидность JWT токена для защищенных эндпоинтов.

**Исключения** (публичные эндпоинты):
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/admin/login`
- `GET /health`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Ошибки**:
- `401 Unauthorized` - токен отсутствует или невалиден
- `403 Forbidden` - токен истек

### 2. Rate Limiting Middleware

Ограничивает количество запросов от одного IP адреса.

**Лимиты**:
- **Аутентификация**: 5 запросов в минуту на `/auth/login`, `/auth/register`
- **Общие запросы**: 100 запросов в минуту для авторизованных пользователей
- **Неавторизованные**: 20 запросов в минуту

**Response при превышении**: `429 Too Many Requests`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

### 3. CORS Middleware

Настройка CORS для веб-клиентов.

**Разрешенные origins**:
- `http://localhost:3000` (development)
- `https://messenger.example.com` (production)

**Разрешенные методы**: GET, POST, PUT, DELETE, OPTIONS

**Разрешенные headers**: Authorization, Content-Type

### 4. Logging Middleware

Логирование всех входящих запросов и исходящих ответов.

**Формат лога**:
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "status": 200,
  "duration_ms": 45,
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "user_id": 1
}
```

---

## Конфигурация

### Environment Variables

```bash
# Server
PORT=8080
HOST=0.0.0.0

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=3600

# Services URLs
AUTH_SERVICE_URL=http://localhost:8081
USER_SERVICE_URL=http://localhost:8082
WORKSPACE_SERVICE_URL=http://localhost:8083
CHAT_SERVICE_URL=http://localhost:8084
TASK_SERVICE_URL=http://localhost:8085
COMPLAINT_SERVICE_URL=http://localhost:8086

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://messenger.example.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## Обработка ошибок

### Формат ответа при ошибке

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": []
  }
}
```

### Коды ошибок Gateway

- `INVALID_TOKEN` - Невалидный JWT токен
- `TOKEN_EXPIRED` - Токен истек
- `RATE_LIMIT_EXCEEDED` - Превышен лимит запросов
- `SERVICE_UNAVAILABLE` - Микросервис недоступен
- `GATEWAY_ERROR` - Внутренняя ошибка Gateway

---

## Метрики (Prometheus)

Gateway экспортирует метрики для мониторинга:

- `http_requests_total` - Общее количество запросов
- `http_request_duration_seconds` - Длительность запросов
- `http_requests_in_flight` - Текущее количество запросов
- `gateway_service_up` - Статус микросервисов (1 = up, 0 = down)
- `rate_limit_exceeded_total` - Количество заблокированных запросов

**Endpoint**: `GET /metrics`

---

## Примечания

1. Gateway не хранит состояние (stateless)
2. Может быть горизонтально масштабирован
3. Рекомендуется использовать за Nginx в production
4. WebSocket соединения прокидываются напрямую к Chat Service
5. Gateway не изменяет тело запросов/ответов (прозрачное проксирование)

---

[← Назад к списку сервисов](./README.md)

