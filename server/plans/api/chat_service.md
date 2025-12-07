# Chat Service

**Порт**: `8084`

**Префикс**: `/api/v1/chats`

---

## Описание

Chat Service - ключевой компонент системы. Управляет чатами, сообщениями и обеспечивает real-time общение через WebSocket.

---

## Эндпоинты (15 + WebSocket)

### Чаты

#### `POST /api/v1/chats`

Создать новый чат.

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "Project Discussion",
  "type": 2,
  "workspace_id": 1,
  "members": [1, 2, 3, 5]
}
```

**Validation**:
- `name`: обязательно для групповых чатов, 3-100 символов
- `type`: 1 (личный), 2 (групповой), 3 (канал)
- `workspace_id`: обязательно, существующее РП
- `members`: массив ID пользователей (для личного чата - ровно 2, включая создателя)

**Response**: `201 Created`
```json
{
  "id": 1,
  "name": "Project Discussion",
  "type": 2,
  "workspace_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "members_count": 4
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - РП не найдено

**Note**: Создатель чата автоматически получает роль администратора (role=2).

---

#### `GET /api/v1/chats`

Получить список чатов пользователя.

**Headers**: `Authorization: Bearer <token>`

**Query params**:
- `workspace_id` - фильтр по РП [опционально]
- `type` - фильтр по типу чата [опционально]

**Response**: `200 OK`
```json
{
  "chats": [
    {
      "id": 1,
      "name": "Project Discussion",
      "type": 2,
      "workspace_id": 1,
      "last_message": {
        "text": "Hello everyone!",
        "date": "2024-01-01T12:00:00Z",
        "user_name": "Ivan Ivanov"
      },
      "unread_count": 5,
      "members_count": 4
    },
    {
      "id": 2,
      "name": "Ivan Ivanov",
      "type": 1,
      "workspace_id": 1,
      "last_message": {
        "text": "See you tomorrow",
        "date": "2024-01-01T11:30:00Z",
        "user_name": "Petr Petrov"
      },
      "unread_count": 0,
      "members_count": 2
    }
  ],
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован

**Note**: Для личных чатов `name` - имя собеседника.

---

#### `GET /api/v1/chats/:id`

Получить информацию о чате.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "Project Discussion",
  "type": 2,
  "workspace_id": 1,
  "members_count": 4,
  "created_at": "2024-01-01T00:00:00Z",
  "my_role": 2
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником чата
- `404` - Чат не найден

---

#### `PUT /api/v1/chats/:id`

Обновить настройки чата.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Body**:
```json
{
  "name": "Updated Project Discussion"
}
```

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "Updated Project Discussion",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор чата)
- `404` - Чат не найден

**Note**: Личные чаты нельзя переименовать.

---

#### `DELETE /api/v1/chats/:id`

Удалить чат.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор чата)
- `404` - Чат не найден

**Note**: Удаляются все сообщения и связи с задачами.

---

### Участники чата

#### `POST /api/v1/chats/:id/members`

Добавить участников в чат.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Body**:
```json
{
  "user_ids": [4, 6, 7],
  "role": 1
}
```

**Response**: `201 Created`
```json
{
  "added": [4, 6, 7],
  "chat_id": 1
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор чата) или пользователи не из РП
- `404` - Чат не найден

**Note**: Нельзя добавить участников в личный чат.

---

#### `GET /api/v1/chats/:id/members`

Получить список участников чата.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Response**: `200 OK`
```json
{
  "members": [
    {
      "id": 1,
      "user_id": 1,
      "login": "user@example.com",
      "name": "Ivan",
      "surname": "Ivanov",
      "role": 2,
      "status": 1,
      "joined_at": "2024-01-01"
    },
    {
      "id": 2,
      "user_id": 2,
      "login": "user2@example.com",
      "name": "Petr",
      "surname": "Petrov",
      "role": 1,
      "status": 4,
      "joined_at": "2024-01-01"
    }
  ],
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником чата
- `404` - Чат не найден

---

#### `PUT /api/v1/chats/:id/members/:user_id`

Изменить роль участника чата.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата
- `user_id` - ID пользователя

**Body**:
```json
{
  "role": 2
}
```

**Response**: `200 OK`
```json
{
  "user_id": 3,
  "chat_id": 1,
  "role": 2
}
```

**Errors**:
- `400` - Невалидная роль
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор чата)
- `404` - Чат или участник не найдены

---

#### `DELETE /api/v1/chats/:id/members/:user_id`

Удалить участника из чата.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата
- `user_id` - ID пользователя

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор чата)
- `404` - Чат или участник не найдены

**Note**: Нельзя удалить последнего администратора чата.

---

### Сообщения

#### `GET /api/v1/chats/:id/messages`

Получить историю сообщений чата.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Query params**:
- `limit` - лимит сообщений (по умолчанию 50, макс 100)
- `offset` - смещение для пагинации
- `before` - получить сообщения до указанной даты (timestamp)

**Response**: `200 OK`
```json
{
  "messages": [
    {
      "id": 1,
      "chat_id": 1,
      "user_id": 1,
      "user_name": "Ivan Ivanov",
      "text": "Hello everyone!",
      "date": 1704110400,
      "status": "read",
      "edited": false
    },
    {
      "id": 2,
      "chat_id": 1,
      "user_id": 2,
      "user_name": "Petr Petrov",
      "text": "Hi Ivan!",
      "date": 1704110450,
      "status": "read",
      "edited": false
    }
  ],
  "has_more": false,
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником чата
- `404` - Чат не найден

**Note**: Сообщения возвращаются от новых к старым.

---

#### `POST /api/v1/chats/:id/messages`

Отправить сообщение в чат (альтернатива WebSocket).

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Body**:
```json
{
  "text": "Hello everyone!"
}
```

**Validation**:
- `text`: обязательно, 1-1000 символов

**Response**: `201 Created`
```json
{
  "id": 1,
  "chat_id": 1,
  "user_id": 1,
  "user_name": "Ivan Ivanov",
  "text": "Hello everyone!",
  "date": 1704110400,
  "status": "sent"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Пользователь не является участником чата или канал (только для админов)
- `404` - Чат не найден

---

#### `PUT /api/v1/chats/:chat_id/messages/:message_id`

Редактировать сообщение.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `chat_id` - ID чата
- `message_id` - ID сообщения

**Body**:
```json
{
  "text": "Updated message text"
}
```

**Response**: `200 OK`
```json
{
  "id": 1,
  "chat_id": 1,
  "text": "Updated message text",
  "edited": true,
  "edited_at": "2024-01-01T12:05:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Пользователь не является автором сообщения
- `404` - Сообщение не найдено

**Note**: Можно редактировать только свои сообщения.

---

#### `DELETE /api/v1/chats/:chat_id/messages/:message_id`

Удалить сообщение.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `chat_id` - ID чата
- `message_id` - ID сообщения

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является автором или администратором чата
- `404` - Сообщение не найдено

**Note**: Автор может удалить свое сообщение, администратор чата - любое.

---

#### `PUT /api/v1/chats/:id/messages/read`

Отметить сообщения как прочитанные.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID чата

**Body**:
```json
{
  "last_message_id": 100
}
```

**Response**: `200 OK`
```json
{
  "chat_id": 1,
  "marked_as_read": 15,
  "last_read_message_id": 100
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником чата
- `404` - Чат не найден

---

### WebSocket

#### `WS /api/v1/chats/ws`

WebSocket соединение для real-time общения.

**Query params**: `token=<jwt_token>`

**Example**: `ws://localhost:8084/api/v1/chats/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

#### События Client → Server

**1. Присоединиться к чату**

```json
{
  "type": "join_chat",
  "chat_id": 1
}
```

**2. Покинуть чат**

```json
{
  "type": "leave_chat",
  "chat_id": 1
}
```

**3. Отправить сообщение**

```json
{
  "type": "send_message",
  "chat_id": 1,
  "text": "Hello everyone!"
}
```

**4. Начать печатать**

```json
{
  "type": "typing",
  "chat_id": 1
}
```

**5. Прекратить печатать**

```json
{
  "type": "stop_typing",
  "chat_id": 1
}
```

---

#### События Server → Client

**1. Новое сообщение**

```json
{
  "type": "new_message",
  "message": {
    "id": 1,
    "chat_id": 1,
    "user_id": 2,
    "user_name": "Petr Petrov",
    "text": "Hello!",
    "date": 1704110400
  }
}
```

**2. Сообщение отредактировано**

```json
{
  "type": "message_edited",
  "message_id": 1,
  "chat_id": 1,
  "text": "Updated text",
  "edited_at": 1704110500
}
```

**3. Сообщение удалено**

```json
{
  "type": "message_deleted",
  "message_id": 1,
  "chat_id": 1
}
```

**4. Пользователь печатает**

```json
{
  "type": "user_typing",
  "chat_id": 1,
  "user_id": 2,
  "user_name": "Petr Petrov"
}
```

**5. Пользователь прекратил печатать**

```json
{
  "type": "user_stopped_typing",
  "chat_id": 1,
  "user_id": 2
}
```

**6. Пользователь присоединился к чату**

```json
{
  "type": "user_joined",
  "chat_id": 1,
  "user_id": 3,
  "user_name": "Sidor Sidorov"
}
```

**7. Пользователь покинул чат**

```json
{
  "type": "user_left",
  "chat_id": 1,
  "user_id": 3
}
```

**8. Ошибка**

```json
{
  "type": "error",
  "code": "UNAUTHORIZED",
  "message": "You are not a member of this chat"
}
```

---

## Типы чатов

| Код | Тип | Описание |
|-----|-----|----------|
| 1 | Личный | Чат один на один, нельзя добавить участников |
| 2 | Групповой | Обычный групповой чат, все могут писать |
| 3 | Канал | Только администраторы могут писать сообщения |

## Роли в чате

| Код | Роль | Права |
|-----|------|-------|
| 1 | Участник | Чтение и отправка сообщений |
| 2 | Администратор | Все права + управление чатом и участниками |

---

## База данных

### Таблицы

**chats**:
```sql
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type INT4 NOT NULL,
  workspacesid INT4 NOT NULL REFERENCES workspaces(id)
);
```

**messages**:
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chatsid INT4 NOT NULL REFERENCES chats(id),
  usersid INT4 NOT NULL REFERENCES users(id),
  text VARCHAR(1000) NOT NULL,
  date INT4 NOT NULL,
  status VARCHAR(5000) NOT NULL
);
```

**userInChat**:
```sql
CREATE TABLE userInChat (
  id SERIAL PRIMARY KEY,
  chatsid INT4 NOT NULL REFERENCES chats(id),
  usersid INT4 NOT NULL REFERENCES users(id),
  role INT4 NOT NULL,
  date DATE NOT NULL
);
```

---

## Конфигурация

### Environment Variables

```bash
PORT=8084
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password

AUTH_SERVICE_URL=http://localhost:8081
USER_SERVICE_URL=http://localhost:8082
WORKSPACE_SERVICE_URL=http://localhost:8083

WEBSOCKET_ENABLED=true
WEBSOCKET_PING_INTERVAL=30
```

---

## Примечания

1. WebSocket - основной способ общения в real-time
2. REST API для сообщений - резервный вариант и для истории
3. Typing events не сохраняются в БД
4. Сообщения индексированы по chat_id и date для быстрого поиска
5. Непрочитанные сообщения считаются на уровне клиента
6. Поддержка автоматического переподключения WebSocket

---

[← Назад к списку сервисов](./README.md)













