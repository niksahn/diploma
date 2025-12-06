# API Gateway (Go, chi)

**Статус**: ✅ Реализован, Kong удалён из цепочки данных (deprecate)

**Порт**: `8080`

**Базовый URL**: `http://localhost:8080`

---

## Описание

Gateway переписан на Go (chi + httputil.ReverseProxy). Он валидирует JWT через Auth Service и добавляет заголовки `X-User-ID`, `X-User-Roles` для всех защищённых запросов, после чего проксирует их к нужным микросервисам. Kong конфигурация больше не используется в рантайме.

---

## Функции

- ✅ Маршрутизация по path-prefix ко всем микросервисам
- ✅ JWT валидация через `/api/v1/auth/validate` + проброс `X-User-ID`, `X-User-Roles`
- ✅ WebSocket проксирование (`/ws`)
- ✅ Прокси Swagger каждого сервиса (`/swagger/<service>/*`)
- ✅ Пример агрегирующего хендлера (`GET /api/v1/gateway/me`)
- ✅ Базовый логгинг/timeout middleware

---

## Маршрутизация (passthrough)

```
/api/v1/auth/*       → Auth Service (AUTH_SERVICE_URL, по умолчанию http://auth-service:8081) [auth middleware пропускается]
/api/v1/users/*      → User Service (http://user-service:8082)
/api/v1/workspaces/* → Workspace Service (http://workspace-service:8083)
/api/v1/chats/*      → Chat Service (http://chat-service:8084)
/api/v1/tasks/*      → Task Service (http://task-service:8085)
/api/v1/complaints/* → Complaint Service (http://complaint-service:8086)
/ws                  → Chat Service (websocket)
```

### Swagger прокси

```
/swagger/auth/*       → Auth Service /swagger/*
/swagger/user/*       → User Service /swagger/*
/swagger/workspace/*  → Workspace Service /swagger/*
/swagger/chat/*       → Chat Service /swagger/*
/swagger/task/*       → Task Service /swagger/*
/swagger/complaint/*  → Complaint Service /swagger/*
/swagger/ui/*         → Swagger UI сервис (http://swagger-ui:8080)
```

---

## Авторизация

- Middleware вызывает `POST /api/v1/auth/validate` Auth-сервиса с заголовком `Authorization: Bearer <token>`.
- Успех: добавляются `X-User-ID`, `X-User-Roles` и запрос проксируется дальше.
- Ошибка/отсутствие токена: `401 Unauthorized`.
- Пропуски: `/health`, `/api/v1/auth/*`, `/swagger/*`.

---

## Агрегации

`GET /api/v1/gateway/me`  
Возвращает профиль текущего пользователя (`/api/v1/users/me`) и список рабочих пространств (`/api/v1/workspaces`). Реализовано как fan-out пример; планируется заменить на сгенерированные OpenAPI клиенты.

---

## Health

`GET /health` — ответ `{"status":"ok","service":"gateway"}` (без проверки апстримов).

---

## Конфигурация (env)

- `PORT` (default `8080`)
- `AUTH_SERVICE_URL` (default `http://auth-service:8081`)
- `USER_SERVICE_URL` (default `http://user-service:8082`)
- `WORKSPACE_SERVICE_URL` (default `http://workspace-service:8083`)
- `CHAT_SERVICE_URL` (default `http://chat-service:8084`)
- `TASK_SERVICE_URL` (default `http://task-service:8085`)
- `COMPLAINT_SERVICE_URL` (default `http://complaint-service:8086`)
- `SWAGGER_UI_SERVICE_URL` (default `http://swagger-ui:8080`)
- `AUTH_VALIDATE_ENDPOINT` (default `/api/v1/auth/validate`)
- `REQUEST_TIMEOUT` (default `10s`)

---

## Миграция

- Kong declarative config (`server/src/kong/declarative/kong.yml`) оставлен только как reference, не используется рантаймом.
- Новый gateway деплоится как отдельный сервис `server/src/services/gateway`.
