# User Service

**Порт**: `8082`

**Префикс**: `/api/v1/users`

---

## Описание

User Service управляет профилями пользователей, их статусами и предоставляет функции поиска.

---

## Эндпоинты (6)

### Профиль пользователя

#### `GET /api/v1/users/me`

Получить профиль текущего пользователя.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "id": 1,
  "login": "user@example.com",
  "surname": "Ivanov",
  "name": "Ivan",
  "patronymic": "Ivanovich",
  "status": 1
}
```

**Errors**:
- `401` - Не авторизован

---

#### `PUT /api/v1/users/me`

Обновить профиль текущего пользователя.

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "surname": "Petrov",
  "name": "Petr",
  "patronymic": "Petrovich"
}
```

**Validation**:
- `surname`: 2-40 символов
- `name`: 2-40 символов
- `patronymic`: до 40 символов (опционально)

**Response**: `200 OK`
```json
{
  "id": 1,
  "login": "user@example.com",
  "surname": "Petrov",
  "name": "Petr",
  "patronymic": "Petrovich",
  "status": 1
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован

---

#### `GET /api/v1/users/:id`

Получить профиль пользователя по ID.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID пользователя

**Response**: `200 OK`
```json
{
  "id": 2,
  "login": "another@example.com",
  "surname": "Sidorov",
  "name": "Sidor",
  "patronymic": "Sidorovich",
  "status": 1
}
```

**Errors**:
- `401` - Не авторизован
- `404` - Пользователь не найден

**Note**: Пароль никогда не возвращается в ответе.

---

#### `PUT /api/v1/users/:id`

Обновить данные пользователя (только для руководителя РП).

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID пользователя

**Body**:
```json
{
  "surname": "Novikov",
  "name": "Nikolay",
  "patronymic": "Nikolaevich"
}
```

**Response**: `200 OK`
```json
{
  "id": 2,
  "login": "another@example.com",
  "surname": "Novikov",
  "name": "Nikolay",
  "patronymic": "Nikolaevich",
  "status": 1
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован
- `403` - Недостаточно прав (не руководитель РП с этим пользователем)
- `404` - Пользователь не найден

**Note**: Требуется проверка, что текущий пользователь является руководителем хотя бы одного РП, где состоит целевой пользователь.

---

### Статус пользователя

#### `PUT /api/v1/users/me/status`

Обновить статус текущего пользователя.

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "status": 2
}
```

**Validation**:
- `status`: 1-4 (1=Онлайн, 2=Не беспокоить, 3=Отошел, 4=Офлайн)

**Response**: `200 OK`
```json
{
  "id": 1,
  "status": 2,
  "updated_at": "2024-01-01T12:00:00Z"
}
```

**Errors**:
- `400` - Невалидный статус
- `401` - Не авторизован

**Note**: При выходе из системы статус автоматически меняется на "Офлайн" (4).

---

### Поиск и список

#### `GET /api/v1/users`

Поиск пользователей с фильтрацией и пагинацией.

**Headers**: `Authorization: Bearer <token>`

**Query params**:
- `search` - строка поиска (по login, surname, name) [опционально]
- `workspace_id` - фильтр по рабочему пространству [опционально]
- `status` - фильтр по статусу (1-4) [опционально]
- `limit` - лимит результатов (по умолчанию 50, макс 100)
- `offset` - смещение для пагинации (по умолчанию 0)

**Example**: `/api/v1/users?search=Ivan&workspace_id=1&limit=20&offset=0`

**Response**: `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "login": "user@example.com",
      "surname": "Ivanov",
      "name": "Ivan",
      "patronymic": "Ivanovich",
      "status": 1
    },
    {
      "id": 3,
      "login": "ivan2@example.com",
      "surname": "Ivanov",
      "name": "Ivan",
      "patronymic": "Petrovich",
      "status": 2
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Errors**:
- `400` - Невалидные параметры
- `401` - Не авторизован

**Note**: Поиск регистронезависимый, ищет подстроку в login, surname, name.

---

#### `GET /api/v1/users/workspace/:workspace_id`

Получить всех пользователей рабочего пространства.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `workspace_id` - ID рабочего пространства

**Response**: `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "login": "user@example.com",
      "surname": "Ivanov",
      "name": "Ivan",
      "patronymic": "Ivanovich",
      "status": 1,
      "role": 2,
      "joined_at": "2024-01-01"
    },
    {
      "id": 2,
      "login": "user2@example.com",
      "surname": "Petrov",
      "name": "Petr",
      "status": 1,
      "role": 1,
      "joined_at": "2024-01-02"
    }
  ],
  "total": 2
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является участником этого РП
- `404` - Рабочее пространство не найдено

**Note**: Включает информацию о роли пользователя в этом РП.

---

## Статусы пользователей

| Код | Статус | Описание |
|-----|--------|----------|
| 1 | Онлайн | Пользователь активен |
| 2 | Не беспокоить | Пользователь не хочет получать уведомления |
| 3 | Отошел | Пользователь временно недоступен |
| 4 | Офлайн | Пользователь не в сети |

---

## База данных

### Таблица users

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  surname VARCHAR(40) NOT NULL,
  name VARCHAR(40) NOT NULL,
  patronymic VARCHAR(40),
  status INT4 NOT NULL DEFAULT 1
);

CREATE INDEX users_id ON users(id);
CREATE UNIQUE INDEX users_login ON users(login);
CREATE INDEX users_status ON users(status);
CREATE INDEX users_name_search ON users(surname, name);
```

---

## Конфигурация

### Environment Variables

```bash
PORT=8082
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password

AUTH_SERVICE_URL=http://localhost:8081
```

---

## Примечания

1. Пользователи не могут изменять свой login после регистрации
2. Пароль можно изменить только через Auth Service
3. Статус автоматически обновляется при логине/логауте
4. Поиск оптимизирован с использованием индексов
5. При удалении пользователя (если будет реализовано), нужен cascade для связанных записей

---

[← Назад к списку сервисов](./README.md)



