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
- ✅ Прокси Swagger каждого сервиса (`/swagger/<service>/*`) и единый Gateway Swagger (`/swagger-docs/gateway.json`)
- ✅ Пример агрегирующего хендлера (`GET /api/v1/gateway/me`)
- ✅ Базовый логгинг/timeout middleware

---

## Маршрутизация (passthrough)

Полный список маршрутов, проксируемых Gateway (путь → сервис):

- Auth (`AUTH_SERVICE_URL`):  
  - POST `/api/v1/auth/register` (публичный)  
  - POST `/api/v1/auth/login` (публичный)  
  - POST `/api/v1/auth/refresh` (публичный)  
  - POST `/api/v1/auth/logout`  
  - POST `/api/v1/auth/admin/login` (публичный)  
  - POST `/api/v1/auth/admin/register` (публичный)  
  - POST `/api/v1/auth/validate` (публичный, внутренний)  

- User (`USER_SERVICE_URL`):  
  - GET `/api/v1/users`  
  - GET `/api/v1/users/me`  
  - PUT `/api/v1/users/me`  
  - PUT `/api/v1/users/me/status`  
  - GET `/api/v1/users/workspace/{workspace_id}`  
  - GET `/api/v1/users/{id}`  
  - PUT `/api/v1/users/{id}`  

- Workspace (`WORKSPACE_SERVICE_URL`):  
  - GET `/api/v1/workspaces`  
  - POST `/api/v1/workspaces`  
  - GET `/api/v1/workspaces/{id}`  
  - PUT `/api/v1/workspaces/{id}`  
  - DELETE `/api/v1/workspaces/{id}`  
  - GET `/api/v1/workspaces/{id}/members`  
  - POST `/api/v1/workspaces/{id}/members`  
  - PUT `/api/v1/workspaces/{id}/members/{user_id}`  
  - DELETE `/api/v1/workspaces/{id}/members/{user_id}`  
  - PUT `/api/v1/workspaces/{id}/leader`  
  - GET `/api/v1/workspaces/tariffs`  
  - POST `/api/v1/workspaces/tariffs`  
  - PUT `/api/v1/workspaces/tariffs/{id}`  

- Chat (`CHAT_SERVICE_URL`):  
  - GET `/api/v1/chats`  
  - POST `/api/v1/chats`  
  - GET `/api/v1/chats/{id}`  
  - PUT `/api/v1/chats/{id}`  
  - DELETE `/api/v1/chats/{id}`  
  - GET `/api/v1/chats/{id}/members`  
  - POST `/api/v1/chats/{id}/members`  
  - PUT `/api/v1/chats/{id}/members/{user_id}`  
  - DELETE `/api/v1/chats/{id}/members/{user_id}`  
  - GET `/api/v1/chats/{id}/messages`  
  - POST `/api/v1/chats/{id}/messages`  
  - PUT `/api/v1/chats/{id}/messages/{message_id}`  
  - DELETE `/api/v1/chats/{id}/messages/{message_id}`  
  - PUT `/api/v1/chats/{id}/messages/read`  
  - WS `/ws` → chat-service WebSocket  

- Task (`TASK_SERVICE_URL`):  
  - GET `/api/v1/tasks`  
  - POST `/api/v1/tasks`  
  - GET `/api/v1/tasks/{id}`  
  - PUT `/api/v1/tasks/{id}`  
  - DELETE `/api/v1/tasks/{id}`  
  - PUT `/api/v1/tasks/{id}/status`  
  - POST `/api/v1/tasks/{id}/assignees`  
  - GET `/api/v1/tasks/{id}/assignees`  
  - DELETE `/api/v1/tasks/{id}/assignees/{user_id}`  
  - POST `/api/v1/tasks/{id}/chats`  
  - GET `/api/v1/tasks/{id}/chats`  
  - DELETE `/api/v1/tasks/{id}/chats/{chat_id}`  
  - GET `/api/v1/tasks/{id}/history`  

- Complaint (`COMPLAINT_SERVICE_URL`):  
  - POST `/api/v1/complaints`  
  - GET `/api/v1/complaints`  
  - GET `/api/v1/complaints/{id}`  
  - PUT `/api/v1/complaints/{id}/status`  
  - DELETE `/api/v1/complaints/{id}`  

- Агрегации (gateway):
  - GET `/api/v1/gateway/me` (users/me + workspaces)

- Health:
  - GET `/health`

- Swagger прокси:
  - `/swagger/auth/*`, `/swagger/user/*`, `/swagger/workspace/*`, `/swagger/chat/*`, `/swagger/task/*`, `/swagger/complaint/*`
  - `/swagger/ui/*` → swagger-ui
  - `/swagger-docs/gateway.json` → единый swagger Gateway

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
- Публичные пути настраиваются через `PUBLIC_ROUTES` (по умолчанию `/health`, `/api/v1/auth`, `/swagger`).

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
- `PUBLIC_ROUTES` (comma-separated, default `/health,/api/v1/auth,/swagger`)

---

## Миграция

- Kong declarative config (`server/src/kong/declarative/kong.yml`) оставлен только как reference, не используется рантаймом.
- Новый gateway деплоится как отдельный сервис `server/src/services/gateway`.
