# Workspace Service

**Порт**: `8083`

**Префикс**: `/api/v1/workspaces`

---

## Описание

Workspace Service управляет рабочими пространствами, участниками, ролями и тарифными планами.

---

## Эндпоинты (12)

### Рабочие пространства

#### `POST /api/v1/workspaces`

Создать рабочее пространство (только администратор).

**Headers**: `Authorization: Bearer <admin_token>`

**Body**:
```json
{
  "name": "Development Team",
  "tariff_id": 1,
  "leader_id": 5
}
```

**Validation**:
- `name`: обязательно, уникальное, 3-100 символов
- `tariff_id`: обязательно, существующий тариф
- `leader_id`: обязательно, существующий пользователь

**Response**: `201 Created`
```json
{
  "id": 1,
  "name": "Development Team",
  "creator": 1,
  "tariffs_id": 1,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор)
- `409` - РП с таким именем уже существует

---

#### `GET /api/v1/workspaces`

Получить список рабочих пространств текущего пользователя.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "workspaces": [
    {
      "id": 1,
      "name": "Development Team",
      "role": 2,
      "joined_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Marketing Team",
      "role": 1,
      "joined_at": "2024-01-05T00:00:00Z"
    }
  ],
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован

**Note**: Возвращает только РП, в которых состоит текущий пользователь.

---

#### `GET /api/v1/workspaces/:id`

Получить информацию о рабочем пространстве.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID рабочего пространства

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "Development Team",
  "creator": 1,
  "tariff": {
    "id": 1,
    "name": "Basic",
    "description": "Basic plan features"
  },
  "members_count": 15,
  "chats_count": 5,
  "tasks_count": 23,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - РП не найдено

---

#### `PUT /api/v1/workspaces/:id`

Обновить параметры рабочего пространства.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID рабочего пространства

**Body**:
```json
{
  "name": "Development Team Updated",
  "tariff_id": 2
}
```

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "Development Team Updated",
  "tariff_id": 2,
  "updated_at": "2024-01-02T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не руководитель РП)
- `404` - РП не найдено
- `409` - РП с таким именем уже существует

---

#### `DELETE /api/v1/workspaces/:id`

Удалить рабочее пространство (только администратор).

**Headers**: `Authorization: Bearer <admin_token>`

**Path params**:
- `id` - ID рабочего пространства

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор)
- `404` - РП не найдено

**Note**: Каскадное удаление всех связанных чатов, задач, участников.

---

### Участники рабочего пространства

#### `POST /api/v1/workspaces/:id/members`

Добавить пользователя в рабочее пространство.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID рабочего пространства

**Body**:
```json
{
  "user_id": 5,
  "role": 1
}
```

**Validation**:
- `user_id`: обязательно, существующий пользователь
- `role`: 1 (участник) или 2 (руководитель)

**Response**: `201 Created`
```json
{
  "user_id": 5,
  "workspace_id": 1,
  "role": 1,
  "date": "2024-01-02"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не руководитель РП)
- `404` - РП или пользователь не найдены
- `409` - Пользователь уже является участником РП

---

#### `GET /api/v1/workspaces/:id/members`

Получить список участников рабочего пространства.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID рабочего пространства

**Response**: `200 OK`
```json
{
  "members": [
    {
      "user_id": 1,
      "login": "user@example.com",
      "name": "Ivan",
      "surname": "Ivanov",
      "patronymic": "Ivanovich",
      "role": 2,
      "status": 1,
      "joined_at": "2024-01-01"
    },
    {
      "user_id": 2,
      "login": "user2@example.com",
      "name": "Petr",
      "surname": "Petrov",
      "role": 1,
      "status": 4,
      "joined_at": "2024-01-02"
    }
  ],
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником РП
- `404` - РП не найдено

---

#### `PUT /api/v1/workspaces/:id/members/:user_id`

Изменить роль пользователя в рабочем пространстве.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID рабочего пространства
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
  "user_id": 5,
  "workspace_id": 1,
  "role": 2,
  "updated_at": "2024-01-03"
}
```

**Errors**:
- `400` - Невалидная роль
- `401` - Не авторизован
- `403` - Недостаточно прав (не руководитель РП)
- `404` - РП или пользователь не найдены

---

#### `DELETE /api/v1/workspaces/:id/members/:user_id`

Удалить пользователя из рабочего пространства.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID рабочего пространства
- `user_id` - ID пользователя

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (не руководитель РП)
- `404` - РП или пользователь не найдены

**Note**: При удалении пользователь также удаляется из всех чатов РП.

---

#### `PUT /api/v1/workspaces/:id/leader`

Сменить руководителя рабочего пространства.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID рабочего пространства

**Body**:
```json
{
  "new_leader_id": 3
}
```

**Response**: `200 OK`
```json
{
  "workspace_id": 1,
  "old_leader_id": 1,
  "new_leader_id": 3,
  "updated_at": "2024-01-03T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не текущий руководитель РП)
- `404` - РП или новый руководитель не найдены

**Note**: Новый руководитель должен быть участником РП. Старый руководитель остается участником с ролью 1.

---

### Тарифы

#### `GET /api/v1/workspaces/tariffs`

Получить список доступных тарифов.

**Response**: `200 OK`
```json
{
  "tariffs": [
    {
      "id": 1,
      "name": "Basic",
      "description": "Basic plan features"
    },
    {
      "id": 2,
      "name": "Professional",
      "description": "Professional plan features"
    },
    {
      "id": 3,
      "name": "Enterprise",
      "description": "Enterprise plan features"
    }
  ]
}
```

**Note**: Эндпоинт публичный, не требует аутентификации.

---

#### `POST /api/v1/workspaces/tariffs`

Создать новый тариф (только администратор).

**Headers**: `Authorization: Bearer <admin_token>`

**Body**:
```json
{
  "name": "Premium",
  "description": "Premium plan features"
}
```

**Response**: `201 Created`
```json
{
  "id": 4,
  "name": "Premium",
  "description": "Premium plan features"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор)
- `409` - Тариф с таким именем уже существует

---

#### `PUT /api/v1/workspaces/tariffs/:id`

Обновить тариф (только администратор).

**Headers**: `Authorization: Bearer <admin_token>`

**Path params**:
- `id` - ID тарифа

**Body**:
```json
{
  "name": "Premium Plus",
  "description": "Premium Plus plan features"
}
```

**Response**: `200 OK`
```json
{
  "id": 4,
  "name": "Premium Plus",
  "description": "Premium Plus plan features",
  "updated_at": "2024-01-03T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор)
- `404` - Тариф не найден

---

## Роли в рабочем пространстве

| Код | Роль | Права |
|-----|------|-------|
| 1 | Участник | Просмотр, создание задач и чатов |
| 2 | Руководитель | Все права участника + управление РП, добавление/удаление участников, изменение ролей |

---

## База данных

### Таблицы

**workspaces**:
```sql
CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  creator INT4 NOT NULL REFERENCES administrators(id),
  tariffsid INT4 NOT NULL REFERENCES tariffs(id)
);
```

**userinworkspace**:
```sql
CREATE TABLE userinworkspace (
  usersid INT4 NOT NULL REFERENCES users(id),
  workspacesid INT4 NOT NULL REFERENCES workspaces(id),
  role INT4 NOT NULL,
  date DATE NOT NULL,
  PRIMARY KEY (usersid, workspacesid)
);
```

**tariffs**:
```sql
CREATE TABLE tariffs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(500) UNIQUE NOT NULL
);
```

---

## Конфигурация

### Environment Variables

```bash
PORT=8083
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password

AUTH_SERVICE_URL=http://localhost:8081
USER_SERVICE_URL=http://localhost:8082
```

---

## Примечания

1. Администратор может создавать РП и назначать любого пользователя руководителем
2. Руководитель РП имеет права на управление участниками и настройками
3. При создании РП указанный leader автоматически добавляется как участник с ролью 2
4. Нельзя удалить последнего руководителя РП
5. Тарифы определяют возможности РП (лимиты на количество участников, чатов, хранилище и т.д.)

---

[← Назад к списку сервисов](./README.md)



