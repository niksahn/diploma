# Task Service

**Порт**: `8085`

**Префикс**: `/api/v1/tasks`

---

## Описание

Task Service управляет задачами, их статусами, исполнителями и историей изменений. Поддерживает привязку задач к чатам для обсуждения.

---

## Эндпоинты (13)

### Задачи

#### `POST /api/v1/tasks`

Создать новую задачу.

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "workspace_id": 1,
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "date": "2024-02-01",
  "status": 1,
  "assigned_users": [2, 3],
  "chat_id": 5
}
```

**Validation**:
- `workspace_id`: обязательно, существующее РП
- `title`: обязательно, 3-100 символов
- `description`: опционально, до 500 символов
- `date`: обязательно, deadline задачи
- `status`: опционально, по умолчанию 1 (создана)
- `assigned_users`: опционально, массив ID пользователей из РП
- `chat_id`: опционально, ID чата из этого РП

**Response**: `201 Created`
```json
{
  "id": 1,
  "creator": 1,
  "workspace_id": 1,
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "date": "2024-02-01",
  "status": 1,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - РП не найдено

---

#### `GET /api/v1/tasks`

Получить список задач с фильтрацией.

**Headers**: `Authorization: Bearer <token>`

**Query params**:
- `workspace_id` - фильтр по РП [обязательно]
- `status` - фильтр по статусу (1-5)
- `assigned_to_me` - только задачи текущего пользователя (true/false)
- `created_by_me` - только созданные текущим пользователем (true/false)
- `limit` - лимит результатов (по умолчанию 50)
- `offset` - смещение для пагинации

**Example**: `/api/v1/tasks?workspace_id=1&status=2&assigned_to_me=true&limit=20`

**Response**: `200 OK`
```json
{
  "tasks": [
    {
      "id": 1,
      "creator": 1,
      "creator_name": "Ivan Ivanov",
      "workspace_id": 1,
      "title": "Implement user authentication",
      "description": "Add JWT-based authentication to the API",
      "date": "2024-02-01",
      "status": 2,
      "assigned_users_count": 2,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "creator": 3,
      "creator_name": "Petr Petrov",
      "workspace_id": 1,
      "title": "Setup CI/CD pipeline",
      "description": null,
      "date": "2024-02-05",
      "status": 1,
      "assigned_users_count": 1,
      "created_at": "2024-01-02T00:00:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Errors**:
- `400` - Невалидные параметры (workspace_id обязателен)
- `401` - Не авторизован
- `403` - Пользователь не является участником РП

---

#### `GET /api/v1/tasks/:id`

Получить детальную информацию о задаче.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Response**: `200 OK`
```json
{
  "id": 1,
  "creator": 1,
  "creator_name": "Ivan Ivanov",
  "workspace_id": 1,
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "date": "2024-02-01",
  "status": 2,
  "assigned_users": [
    {
      "user_id": 2,
      "name": "Petr Petrov",
      "assigned_at": "2024-01-01"
    },
    {
      "user_id": 3,
      "name": "Sidor Sidorov",
      "assigned_at": "2024-01-01"
    }
  ],
  "chats": [
    {
      "id": 5,
      "name": "Auth Discussion"
    }
  ],
  "changes_history": [
    {
      "id": 1,
      "description": "Status changed from 1 to 2",
      "created_at": "2024-01-02T00:00:00Z"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - Задача не найдена

---

#### `PUT /api/v1/tasks/:id`

Обновить задачу.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Body**:
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "date": "2024-02-15",
  "status": 3
}
```

**Response**: `200 OK`
```json
{
  "id": 1,
  "title": "Updated title",
  "description": "Updated description",
  "date": "2024-02-15",
  "status": 3,
  "updated_at": "2024-01-03T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не создатель и не назначенный исполнитель)
- `404` - Задача не найдена

**Note**: Любое изменение записывается в историю (taskChanges).

---

#### `DELETE /api/v1/tasks/:id`

Удалить задачу.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (только создатель или руководитель РП)
- `404` - Задача не найдена

**Note**: Каскадное удаление всех связей (исполнители, чаты, история).

---

### Статус задачи

#### `PUT /api/v1/tasks/:id/status`

Изменить статус задачи.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Body**:
```json
{
  "status": 3,
  "comment": "Ready for review"
}
```

**Validation**:
- `status`: 1-5 (1=Создана, 2=В работе, 3=На проверке, 4=Завершена, 5=Отменена)
- `comment`: опционально, до 1000 символов

**Response**: `200 OK`
```json
{
  "id": 1,
  "status": 3,
  "changed_by": 2,
  "changed_by_name": "Petr Petrov",
  "comment": "Ready for review",
  "changed_at": "2024-01-03T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидный статус
- `401` - Не авторизован
- `403` - Недостаточно прав (не создатель и не исполнитель)
- `404` - Задача не найдена

**Note**: Изменение статуса добавляется в историю с комментарием.

---

### Исполнители задачи

#### `POST /api/v1/tasks/:id/assignees`

Назначить пользователей на задачу.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Body**:
```json
{
  "user_ids": [4, 5, 6]
}
```

**Validation**:
- `user_ids`: массив ID пользователей из РП

**Response**: `201 Created`
```json
{
  "task_id": 1,
  "assigned": [4, 5, 6],
  "assigned_at": "2024-01-03"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не создатель) или пользователи не из РП
- `404` - Задача не найдена
- `409` - Пользователь уже назначен на задачу

**Note**: Назначение добавляется в историю.

---

#### `GET /api/v1/tasks/:id/assignees`

Получить список исполнителей задачи.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Response**: `200 OK`
```json
{
  "assignees": [
    {
      "user_id": 2,
      "name": "Petr Petrov",
      "surname": "Petrov",
      "status": 1,
      "assigned_at": "2024-01-01"
    },
    {
      "user_id": 3,
      "name": "Sidor Sidorov",
      "surname": "Sidorov",
      "status": 2,
      "assigned_at": "2024-01-01"
    }
  ],
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - Задача не найдена

---

#### `DELETE /api/v1/tasks/:id/assignees/:user_id`

Удалить исполнителя из задачи.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи
- `user_id` - ID пользователя

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (не создатель задачи)
- `404` - Задача или исполнитель не найдены

**Note**: Удаление записывается в историю.

---

### Привязка к чатам

#### `POST /api/v1/tasks/:id/chats`

Прикрепить задачу к чату.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Body**:
```json
{
  "chat_id": 5
}
```

**Validation**:
- `chat_id`: существующий чат из того же РП

**Response**: `201 Created`
```json
{
  "id": 1,
  "task_id": 1,
  "chat_id": 5,
  "attached_at": "2024-01-03"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Чат не из того же РП
- `404` - Задача или чат не найдены
- `409` - Задача уже прикреплена к этому чату

---

#### `GET /api/v1/tasks/:id/chats`

Получить список чатов, к которым прикреплена задача.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Response**: `200 OK`
```json
{
  "chats": [
    {
      "id": 5,
      "name": "Auth Discussion",
      "type": 2,
      "attached_at": "2024-01-03"
    },
    {
      "id": 7,
      "name": "Dev Team Chat",
      "type": 2,
      "attached_at": "2024-01-05"
    }
  ],
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - Задача не найдена

---

#### `DELETE /api/v1/tasks/:id/chats/:chat_id`

Открепить задачу от чата.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи
- `chat_id` - ID чата

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (не создатель задачи)
- `404` - Задача или связь не найдены

---

### История изменений

#### `GET /api/v1/tasks/:id/history`

Получить историю изменений задачи.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID задачи

**Response**: `200 OK`
```json
{
  "changes": [
    {
      "id": 3,
      "description": "Status changed from 2 to 3 by Petr Petrov. Comment: Ready for review",
      "created_at": "2024-01-03T00:00:00Z"
    },
    {
      "id": 2,
      "description": "User Sidor Sidorov assigned to task by Ivan Ivanov",
      "created_at": "2024-01-02T00:00:00Z"
    },
    {
      "id": 1,
      "description": "Status changed from 1 to 2 by Ivan Ivanov",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 3
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - Задача не найдена

**Note**: История возвращается от новых записей к старым.

---

## Статусы задач

| Код | Статус | Описание |
|-----|--------|----------|
| 1 | Создана | Задача создана, ожидает начала работы |
| 2 | В работе | Задача в процессе выполнения |
| 3 | На проверке | Задача выполнена, ожидает проверки |
| 4 | Завершена | Задача успешно завершена |
| 5 | Отменена | Задача отменена |

---

## База данных

### Таблицы

**tasks**:
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  creator INT4 NOT NULL REFERENCES users(id),
  workspacesid INT4 NOT NULL REFERENCES workspaces(id),
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  date DATE NOT NULL,
  status INT4 NOT NULL DEFAULT 1
);
```

**userInTask**:
```sql
CREATE TABLE userInTask (
  id SERIAL PRIMARY KEY,
  tasksid INT4 NOT NULL REFERENCES tasks(id),
  usersid INT4 NOT NULL REFERENCES users(id)
);
```

**taskInChat**:
```sql
CREATE TABLE taskInChat (
  id SERIAL PRIMARY KEY,
  chatsid INT4 NOT NULL REFERENCES chats(id),
  tasksid INT4 NOT NULL REFERENCES tasks(id)
);
```

**taskChanges**:
```sql
CREATE TABLE taskChanges (
  id SERIAL PRIMARY KEY,
  description VARCHAR(1000) NOT NULL,
  tasksid INT4 NOT NULL REFERENCES tasks(id)
);
```

---

## Конфигурация

### Environment Variables

```bash
PORT=8085
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password

AUTH_SERVICE_URL=http://localhost:8081
USER_SERVICE_URL=http://localhost:8082
WORKSPACE_SERVICE_URL=http://localhost:8083
CHAT_SERVICE_URL=http://localhost:8084
```

---

## Примечания

1. Задачи всегда привязаны к рабочему пространству
2. История изменений автоматически создается при любых изменениях
3. Исполнители могут изменять статус задачи
4. Создатель задачи имеет все права на нее
5. Руководитель РП может управлять любыми задачами в своем РП
6. Задачи могут быть прикреплены к нескольким чатам для обсуждения
7. При удалении пользователя из РП он автоматически удаляется из всех задач

---

[← Назад к списку сервисов](./README.md)



