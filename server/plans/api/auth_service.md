# Auth Service

**Порт**: `8081`

**Префикс**: `/api/v1/auth`

---

## Описание

Auth Service отвечает за регистрацию, аутентификацию пользователей и администраторов, выдачу и валидацию JWT токенов.

---

## Эндпоинты (7)

### Регистрация и вход

#### `POST /api/v1/auth/register`

Регистрация нового пользователя.

**Body**:
```json
{
  "login": "user@example.com",
  "password": "SecurePassword123",
  "surname": "Ivanov",
  "name": "Ivan",
  "patronymic": "Ivanovich"
}
```

**Validation**:
- `login`: обязательно, уникальный, 3-50 символов
- `password`: обязательно, минимум 8 символов
- `surname`: обязательно, 2-40 символов
- `name`: обязательно, 2-40 символов
- `patronymic`: опционально, до 40 символов

**Response**: `201 Created`
```json
{
  "id": 1,
  "login": "user@example.com",
  "message": "User created successfully"
}
```

**Errors**:
- `400` - Невалидные данные
- `409` - Пользователь с таким login уже существует

---

#### `POST /api/v1/auth/login`

Вход пользователя в систему.

**Body**:
```json
{
  "login": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "login": "user@example.com",
    "name": "Ivan",
    "surname": "Ivanov",
    "status": 1
  }
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Неверный логин или пароль

---

#### `POST /api/v1/auth/refresh`

Обновление access токена с помощью refresh токена.

**Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Errors**:
- `400` - Refresh token не предоставлен
- `401` - Невалидный или истекший refresh token

---

#### `POST /api/v1/auth/logout`

Выход пользователя из системы (инвалидация refresh токена).

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

**Errors**:
- `401` - Не авторизован

---

### Администраторы

#### `POST /api/v1/auth/admin/login`

Вход администратора в систему.

**Body**:
```json
{
  "login": "admin@example.com",
  "password": "AdminSecurePassword123"
}
```

**Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "admin": {
    "id": 1,
    "login": "admin@example.com"
  }
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Неверный логин или пароль

**Note**: Токен администратора содержит роль `admin` в payload.

---

#### `POST /api/v1/auth/admin/register`

Регистрация нового администратора.

**Body**:
```json
{
  "login": "admin@example.com",
  "password": "AdminSecurePassword123"
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "login": "admin@example.com",
  "message": "Administrator created successfully"
}
```

**Errors**:
- `400` - Невалидные данные
- `409` - Администратор с таким login уже существует

**Note**: Эндпоинт должен быть защищен или доступен только при первичной настройке.

---

### Валидация (Internal)

#### `POST /api/v1/auth/validate`

Валидация JWT токена (используется другими микросервисами).

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "valid": true,
  "user_id": 1,
  "role": "user",
  "expires_at": "2024-01-01T13:00:00Z"
}
```

**Response при невалидном токене**: `401 Unauthorized`
```json
{
  "valid": false,
  "error": "Token expired"
}
```

**Note**: Этот эндпоинт предназначен для внутреннего использования микросервисами, не должен быть доступен публично.

---

## JWT Токены

### Структура Access Token

**Payload**:
```json
{
  "user_id": 1,
  "role": "user",
  "iat": 1704110400,
  "exp": 1704114000
}
```

**Lifetime**: 1 час (3600 секунд)

### Структура Refresh Token

**Payload**:
```json
{
  "user_id": 1,
  "role": "user",
  "type": "refresh",
  "iat": 1704110400,
  "exp": 1704714000
}
```

**Lifetime**: 7 дней (604800 секунд)

---

## Хеширование паролей

- **Алгоритм**: bcrypt
- **Cost factor**: 12
- Пароли хранятся только в виде хешей
- При логине пароль сравнивается с хешем

---

## База данных

### Таблицы

**users**:
- `id` (SERIAL, PK)
- `login` (VARCHAR(50), UNIQUE)
- `password` (VARCHAR(100), bcrypt hash)
- `surname` (VARCHAR(40))
- `name` (VARCHAR(40))
- `patronymic` (VARCHAR(40), nullable)
- `status` (INT4, default 1)

**administrators**:
- `id` (SERIAL, PK)
- `login` (VARCHAR(100), UNIQUE)
- `password` (VARCHAR(100), bcrypt hash)

**refresh_tokens** (опционально, для отслеживания):
- `id` (SERIAL, PK)
- `user_id` (INT4, FK → users.id)
- `token` (VARCHAR(500))
- `expires_at` (TIMESTAMP)
- `revoked` (BOOLEAN, default false)

---

## Конфигурация

### Environment Variables

```bash
PORT=8081
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password

JWT_SECRET=your_jwt_secret_key_here
JWT_ACCESS_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

BCRYPT_COST=12
```

---

## Безопасность

1. **Хеширование паролей**: bcrypt с cost factor 12
2. **JWT secret**: Должен быть длинным и случайным (минимум 32 символа)
3. **Rate limiting**: Ограничение попыток логина (5 попыток в минуту)
4. **Refresh tokens**: Хранятся в БД для возможности отзыва
5. **HTTPS**: В production обязательно использовать HTTPS
6. **Валидация**: Строгая валидация всех входных данных

---

## Примечания

1. При логине статус пользователя автоматически меняется на "Онлайн" (1)
2. При logout refresh токен помечается как отозванный (revoked)
3. Refresh токены одноразовые - при использовании выдается новый refresh токен
4. Access токен не может быть отозван (короткий lifetime компенсирует это)

---

[← Назад к списку сервисов](./README.md)

