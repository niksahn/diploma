# Workspace Service - Quick Testing Guide

## Запуск сервиса

```bash
cd server/src/services/workspace
go mod download
go run main.go
```

Сервис будет доступен на `http://localhost:8083`

## Примеры запросов (curl)

### 1. Получить список тарифов (публичный эндпоинт)

```bash
curl -X GET http://localhost:8083/api/v1/workspaces/tariffs
```

### 2. Создать тариф (администратор)

```bash
curl -X POST http://localhost:8083/api/v1/workspaces/tariffs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-User-ID: 1" \
  -H "X-User-Role: admin" \
  -d '{
    "name": "Basic",
    "description": "Basic plan features"
  }'
```

### 3. Создать рабочее пространство (администратор)

```bash
curl -X POST http://localhost:8083/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-User-ID: 1" \
  -H "X-User-Role: admin" \
  -d '{
    "name": "Development Team",
    "tariff_id": 1,
    "leader_id": 5
  }'
```

### 4. Получить список РП пользователя

```bash
curl -X GET http://localhost:8083/api/v1/workspaces \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5"
```

### 5. Получить информацию о РП

```bash
curl -X GET http://localhost:8083/api/v1/workspaces/1 \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5"
```

### 6. Обновить РП (руководитель)

```bash
curl -X PUT http://localhost:8083/api/v1/workspaces/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5" \
  -d '{
    "name": "Development Team Updated",
    "tariff_id": 2
  }'
```

### 7. Добавить участника в РП (руководитель)

```bash
curl -X POST http://localhost:8083/api/v1/workspaces/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5" \
  -d '{
    "user_id": 10,
    "role": 1
  }'
```

### 8. Получить список участников РП

```bash
curl -X GET http://localhost:8083/api/v1/workspaces/1/members \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5"
```

### 9. Изменить роль участника (руководитель)

```bash
curl -X PUT http://localhost:8083/api/v1/workspaces/1/members/10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5" \
  -d '{
    "role": 2
  }'
```

### 10. Сменить руководителя РП (текущий руководитель)

```bash
curl -X PUT http://localhost:8083/api/v1/workspaces/1/leader \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5" \
  -d '{
    "new_leader_id": 10
  }'
```

### 11. Удалить участника из РП (руководитель)

```bash
curl -X DELETE http://localhost:8083/api/v1/workspaces/1/members/10 \
  -H "Authorization: Bearer <user_token>" \
  -H "X-User-ID: 5"
```

### 12. Удалить РП (администратор)

```bash
curl -X DELETE http://localhost:8083/api/v1/workspaces/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-User-ID: 1" \
  -H "X-User-Role: admin"
```

## Health Check

```bash
curl -X GET http://localhost:8083/health
```

Ответ:
```json
{
  "status": "ok",
  "service": "workspace-service"
}
```

## Swagger UI

Откройте в браузере:
```
http://localhost:8083/swagger/index.html
```

## Коды ответов

- `200 OK` - Успешный запрос
- `201 Created` - Ресурс создан
- `204 No Content` - Успешное удаление
- `400 Bad Request` - Невалидные данные
- `401 Unauthorized` - Не авторизован
- `403 Forbidden` - Недостаточно прав
- `404 Not Found` - Ресурс не найден
- `409 Conflict` - Конфликт (дубликат)
- `500 Internal Server Error` - Ошибка сервера

## Роли

- **admin** - Администратор (создание/удаление РП, управление тарифами)
- **user** - Обычный пользователь
  - **Роль 1** в РП - Участник
  - **Роль 2** в РП - Руководитель

## Примечания

1. Заголовки `X-User-ID` и `X-User-Role` в продакшене устанавливаются API Gateway после валидации JWT токена
2. Для локального тестирования можно устанавливать их вручную
3. Все эндпоинты (кроме `/tariffs` GET) требуют авторизации
4. Руководитель РП автоматически добавляется при создании РП
