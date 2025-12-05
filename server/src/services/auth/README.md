# Auth Service

Микросервис авторизации для корпоративного мессенджера.

## Описание

Auth Service отвечает за:
- Регистрацию и аутентификацию пользователей
- Регистрацию и аутентификацию администраторов
- Выдачу и валидацию JWT токенов (Access/Refresh)
- Управление refresh токенами

## Технологии

- **Go 1.21+**
- **Gin** - HTTP веб-фреймворк
- **pgx/v5** - PostgreSQL драйвер
- **golang-jwt/jwt/v5** - JWT токены
- **bcrypt** - Хеширование паролей
- **swaggo/swag** - Swagger документация

## Структура проекта

```
auth/
├── main.go              # Точка входа
├── config/              # Конфигурация
│   └── config.go
├── models/              # Модели данных
│   └── models.go
├── database/            # Подключение к БД
│   └── database.go
├── repository/          # Слой доступа к данным
│   └── repository.go
├── handlers/            # HTTP обработчики
│   └── auth_handler.go
├── utils/               # Утилиты
│   ├── jwt.go
│   └── password.go
├── docs/                # Swagger документация (генерируется)
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
├── Dockerfile
├── Makefile            # Команды для разработки
├── go.mod
└── README.md
```

## API Эндпоинты

Все эндпоинты имеют префикс `/api/v1/auth`

### Пользователи
- `POST /api/v1/auth/register` - Регистрация пользователя
- `POST /api/v1/auth/login` - Вход пользователя
- `POST /api/v1/auth/refresh` - Обновление токена
- `POST /api/v1/auth/logout` - Выход из системы

### Администраторы
- `POST /api/v1/auth/admin/login` - Вход администратора
- `POST /api/v1/auth/admin/register` - Регистрация администратора

### Валидация (Internal)
- `POST /api/v1/auth/validate` - Валидация JWT токена

### Health Check
- `GET /health` - Проверка работоспособности

## Конфигурация

Переменные окружения:

```bash
PORT=8081
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password

JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters_long
JWT_ACCESS_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

BCRYPT_COST=12
```

## Запуск

### Локально

```bash
cd server/src/services/auth
go mod download
go run main.go
```

### Docker

```bash
cd server/src
docker-compose up auth-service
```

## Swagger документация

Сервис включает Swagger UI для интерактивной документации API.

### Генерация Swagger документации

Перед первым запуском необходимо сгенерировать Swagger документацию:

```bash
# Установить swag (если еще не установлен)
go install github.com/swaggo/swag/cmd/swag@latest

# Сгенерировать документацию
cd server/src/services/auth
swag init -g main.go -o docs --parseDependency --parseInternal
```

Или используйте Makefile:

```bash
make swagger
```

### Доступ к Swagger UI

После запуска сервиса Swagger UI доступен по адресу:

```
http://localhost:8081/swagger/index.html
```

### Использование

1. Откройте Swagger UI в браузере
2. Все эндпоинты сгруппированы по тегам:
   - **auth** - эндпоинты для пользователей
   - **admin** - эндпоинты для администраторов
   - **internal** - внутренние эндпоинты
3. Для тестирования эндпоинтов, требующих авторизации:
   - Сначала выполните `/auth/login` или `/auth/admin/login`
   - Скопируйте полученный `access_token`
   - Нажмите кнопку "Authorize" в Swagger UI
   - Введите: `Bearer <ваш_токен>`
   - Теперь можно тестировать защищенные эндпоинты

## База данных

Сервис использует следующие таблицы:
- `users` - пользователи системы
- `administrators` - администраторы
- `refresh_tokens` - refresh токены (создается автоматически)

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

**Поля**:
- `user_id` - ID пользователя или администратора
- `role` - роль пользователя (`"user"` или `"admin"`)
- `iat` - время выдачи токена (Unix timestamp)
- `exp` - время истечения токена (Unix timestamp)

**Время жизни**: 1 час (3600 секунд)

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

**Поля**:
- `user_id` - ID пользователя или администратора
- `role` - роль пользователя (`"user"` или `"admin"`)
- `type` - тип токена, всегда `"refresh"`
- `iat` - время выдачи токена (Unix timestamp)
- `exp` - время истечения токена (Unix timestamp)

**Время жизни**: 7 дней (604800 секунд)

### Валидация токенов

Эндпоинт `POST /api/v1/auth/validate` возвращает информацию о токене:

**Успешный ответ**:
```json
{
  "valid": true,
  "user_id": 1,
  "role": "user",
  "expires_at": "2024-01-01T13:00:00Z"
}
```

**Ошибка валидации**:
```json
{
  "valid": false,
  "error": "Token expired"
}
```

## Безопасность

- Пароли хешируются с помощью bcrypt (cost factor 12)
- JWT токены подписываются секретным ключом (HS256)
- Access токены имеют короткий срок жизни (1 час)
- Refresh токены имеют длинный срок жизни (7 дней) и могут быть отозваны
- Refresh токены одноразовые - при использовании выдается новый
- Refresh токены хранятся в БД для возможности отзыва

## Документация API

Полная документация API находится в [`server/plans/api/auth_service.md`](../../../plans/api/auth_service.md)

