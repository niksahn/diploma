# API Gateway (Kong)

**Статус**: ✅ Реализован

**Порт**: `8080`

**Базовый URL**: `http://localhost:8080`

**Admin API**: `http://localhost:8001`

**Admin GUI**: `http://localhost:8002`

---

## Описание

API Gateway на базе **Kong Gateway** — единая точка входа для всех клиентов (Web, Desktop, Mobile). Обеспечивает маршрутизацию запросов к микросервисам, валидацию JWT токенов, rate limiting, CORS обработку и мониторинг через плагинную архитектуру.

---

## Функции

- ✅ Маршрутизация запросов к микросервисам
- ✅ JWT токен валидация и claims extraction
- ✅ Rate limiting (защита от DDoS)
- ✅ CORS обработка для веб-клиентов
- ✅ Request/Response трансформация
- ✅ Логирование всех запросов
- ✅ Метрики Prometheus
- ✅ WebSocket проксирование
- ✅ API versioning
- ✅ Circuit breaker (Kong Enterprise)
- ✅ Request tracing

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
  "timestamp": "2024-12-04T12:00:00Z",
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "workspace": "healthy",
    "chat": "healthy",
    "task": "not_implemented",
    "complaint": "not_implemented"
  },
  "database": "connected"
}
```

**Response при проблемах**: `503 Service Unavailable`

```json
{
  "status": "degraded",
  "timestamp": "2024-12-04T12:00:00Z",
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "workspace": "unhealthy",
    "chat": "healthy",
    "task": "not_implemented",
    "complaint": "not_implemented"
  },
  "database": "connected"
}
```

---

## Kong Plugins

### 1. JWT Plugin

Валидирует JWT токены и извлекает claims для использования в других плагинах.

**Конфигурация**:
```yaml
name: jwt
config:
  secret_is_base64: false
  key_claim_name: iss
  claims_to_verify:
    - exp
```

**Исключения** (публичные роуты):
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/admin/login`
- `GET /health`

**Доступные claims**:
- `$(jwt.claims.user_id)` - ID пользователя
- `$(jwt.claims.role)` - роль пользователя
- `$(jwt.claims.exp)` - время истечения

**Ошибки**:
- `401 Unauthorized` - токен отсутствует или невалиден
- `403 Forbidden` - токен истек

### 2. Request Transformer Plugin

Преобразует запросы, добавляя заголовки с данными из JWT claims.

**Конфигурация**:
```yaml
name: request-transformer
config:
  add:
    headers:
      - "X-User-ID:$(jwt.claims.user_id)"
      - "X-User-Role:$(jwt.claims.role)"
```

**Добавляемые заголовки**:
- `X-User-ID` - ID пользователя из JWT
- `X-User-Role` - роль пользователя из JWT

### 3. Rate Limiting Plugin

Ограничивает количество запросов по различным критериям.

**Конфигурация**:
```yaml
name: rate-limiting
config:
  minute: 100
  policy: local
```

**Лимиты по сервисам**:
- **Auth Service**: 5 запросов в минуту на `/auth/login`, `/auth/register`
- **Защищенные сервисы**: 100 запросов в минуту
- **Публичные**: 20 запросов в минуту

**Response при превышении**: `429 Too Many Requests`

```json
{
  "message": "API rate limit exceeded"
}
```

### 4. CORS Plugin

Обработка CORS для веб-клиентов.

**Конфигурация**:
```yaml
name: cors
config:
  origins:
    - "http://localhost:3000"
    - "https://messenger.example.com"
  methods:
    - GET
    - POST
    - PUT
    - DELETE
    - OPTIONS
  headers:
    - Authorization
    - Content-Type
```

### 5. Prometheus Plugin

Экспортирует метрики для мониторинга.

**Конфигурация**:
```yaml
name: prometheus
config: {}
```

**Метрики**:
- `kong_http_requests_total` - общее количество запросов
- `kong_http_requests_duration_ms` - длительность запросов
- `kong_http_requests_size_bytes` - размер запросов
- `kong_upstream_response_size_bytes` - размер ответов

---

## Конфигурация

### Docker Compose

```yaml
kong:
  image: kong:3.4
  environment:
    KONG_DATABASE: postgres
    KONG_PG_HOST: kong-database
    KONG_ADMIN_LISTEN: 0.0.0.0:8001
    KONG_ADMIN_GUI_LISTEN: 0.0.0.0:8002
    KONG_PROXY_LISTEN: 0.0.0.0:8000
    KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
  ports:
    - "8080:8000"    # Proxy port
    - "8001:8001"    # Admin API
    - "8002:8002"    # Admin GUI
  volumes:
    - ./kong.yml:/kong/declarative/kong.yml
  depends_on:
    - kong-database

kong-database:
  image: postgres:13
  environment:
    POSTGRES_DB: kong
    POSTGRES_USER: kong
    POSTGRES_PASSWORD: kong
```

### Declarative Configuration (kong.yml)

```yaml
_format_version: "3.0"
services:
  - name: auth-service
    url: http://auth-service:8081
    routes:
      - paths:
          - /api/v1/auth
        strip_path: false
        methods: ["GET", "POST", "PUT", "DELETE"]
    plugins:
      - name: rate-limiting
        config:
          minute: 5
          policy: local
      - name: cors

  - name: user-service
    url: http://user-service:8082
    routes:
      - paths:
          - /api/v1/users
        strip_path: false
        methods: ["GET", "POST", "PUT", "DELETE"]
    plugins:
      - name: jwt
        config:
          secret_is_base64: false
      - name: request-transformer
        config:
          add:
            headers:
              - "X-User-ID:$(jwt.claims.user_id)"
              - "X-User-Role:$(jwt.claims.role)"
      - name: rate-limiting
        config:
          minute: 100
      - name: cors
      - name: prometheus

  - name: workspace-service
    url: http://workspace-service:8083
    routes:
      - paths:
          - /api/v1/workspaces
        strip_path: false
    plugins:
      - name: jwt
      - name: request-transformer
        config:
          add:
            headers:
              - "X-User-ID:$(jwt.claims.user_id)"
              - "X-User-Role:$(jwt.claims.role)"
      - name: rate-limiting
      - name: cors
      - name: prometheus

  - name: chat-service
    url: http://chat-service:8084
    routes:
      - paths:
          - /api/v1/chats
        strip_path: false
    plugins:
      - name: jwt
      - name: request-transformer
        config:
          add:
            headers:
              - "X-User-ID:$(jwt.claims.user_id)"
              - "X-User-Role:$(jwt.claims.role)"
      - name: rate-limiting
      - name: cors
      - name: prometheus

  - name: task-service
    url: http://task-service:8085
    routes:
      - paths:
          - /api/v1/tasks
        strip_path: false
    plugins:
      - name: jwt
      - name: request-transformer
        config:
          add:
            headers:
              - "X-User-ID:$(jwt.claims.user_id)"
              - "X-User-Role:$(jwt.claims.role)"
      - name: rate-limiting
      - name: cors
      - name: prometheus

  - name: complaint-service
    url: http://complaint-service:8086
    routes:
      - paths:
          - /api/v1/complaints
        strip_path: false
    plugins:
      - name: jwt
      - name: request-transformer
        config:
          add:
            headers:
              - "X-User-ID:$(jwt.claims.user_id)"
              - "X-User-Role:$(jwt.claims.role)"
      - name: rate-limiting
      - name: cors
      - name: prometheus
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

### HTTP Статусы Kong

Kong возвращает стандартные HTTP статусы:

- `401 Unauthorized` - отсутствует или невалиден JWT токен
- `403 Forbidden` - токен истек или недостаточно прав
- `429 Too Many Requests` - превышен лимит запросов (rate limiting)
- `502 Bad Gateway` - upstream сервис недоступен
- `503 Service Unavailable` - Kong не может обработать запрос
- `504 Gateway Timeout` - таймаут upstream сервиса

### Формат ошибок плагинов

**JWT Plugin**:
```json
{
  "message": "Unauthorized"
}
```

**Rate Limiting Plugin**:
```json
{
  "message": "API rate limit exceeded"
}
```

**CORS Plugin**:
```json
{
  "message": "CORS policy violation"
}
```

---

## Метрики (Prometheus)

Kong экспортирует метрики по адресу `/metrics`:

### Основные метрики

**HTTP метрики**:
- `kong_http_requests_total` - общее количество запросов по методам и статусам
- `kong_http_requests_duration_ms` - гистограмма длительности запросов
- `kong_http_requests_size_bytes` - размер входящих запросов
- `kong_upstream_response_size_bytes` - размер ответов upstream

**Rate Limiting**:
- `kong_ratelimiting_rate_limited` - количество заблокированных запросов

**Upstream Health**:
- `kong_upstream_healthy` - статус upstream серверов
- `kong_upstream_response_time_ms` - время ответа upstream

**Плагины**:
- `kong_plugin_jwt_total` - использование JWT плагина
- `kong_plugin_request_transformer_total` - использование request transformer

**Endpoint**: `GET /metrics`

---

## Примечания

1. **Declarative Configuration** - Kong поддерживает декларативную конфигурацию через YAML/JSON файлы
2. **Admin API** - динамическое управление через REST API (порт 8001)
3. **Admin GUI** - веб-интерфейс Kong Manager (порт 8002)
4. **Плагинная архитектура** - расширяемость через Lua плагины
5. **Database-backed** - хранение конфигурации в PostgreSQL/Cassandra
6. **WebSocket поддержка** - прозрачное проксирование WebSocket соединений
7. **Service Discovery** - интеграция с Kubernetes, Consul, DNS
8. **Enterprise Edition** - расширенные возможности (circuit breaker, API analytics)

---

[← Назад к списку сервисов](./README.md)

---

**Последнее обновление**: 2024-12-04



