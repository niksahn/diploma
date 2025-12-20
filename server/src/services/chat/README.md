# Chat Service

Микросервис управления чатами и сообщениями для корпоративного мессенджера.

## Описание

Chat Service отвечает за:
- Управление чатами (создание, обновление, удаление)
- Управление участниками чатов
- Обработку сообщений (отправка, редактирование, удаление)
- Real-time общение через WebSocket
- Отметку сообщений как прочитанных

## Технологии

- **Go 1.23+**
- **Gin** - HTTP веб-фреймворк
- **gorilla/websocket** - WebSocket для real-time общения
- **pgx/v5** - PostgreSQL драйвер
- **swaggo/swag** - Swagger документация

## Структура проекта

```
chat/
├── main.go                    # Точка входа
├── config/                    # Конфигурация
│   └── config.go
├── data/                      # Слой данных
│   ├── database/             # Подключение к БД
│   │   └── database.go
│   ├── databaseModels/       # Модели данных БД
│   │   └── models.go
│   └── repository/            # Слой доступа к данным
│       └── repository.go
├── presentation/             # Слой представления
│   ├── handlers/             # HTTP обработчики
│   │   ├── chat_handler.go
│   │   ├── member_handler.go
│   │   ├── message_handler.go
│   │   └── websocket_handler.go
│   └── models/               # DTO для API
│       └── models.go
├── docs/                     # Swagger документация (генерируется)
│   └── docs.go
├── Dockerfile
├── Makefile                  # Команды для разработки
├── go.mod
└── README.md
```

## API Эндпоинты

Все эндпоинты имеют префикс `/api/v1/chats`

### Чаты
- `POST /api/v1/chats` - Создать новый чат
- `GET /api/v1/chats` - Получить список чатов пользователя
- `GET /api/v1/chats/:id` - Получить информацию о чате
- `PUT /api/v1/chats/:id` - Обновить настройки чата
- `DELETE /api/v1/chats/:id` - Удалить чат

### Участники чата
- `POST /api/v1/chats/:id/members` - Добавить участников в чат
- `GET /api/v1/chats/:id/members` - Получить список участников чата
- `PUT /api/v1/chats/:id/members/:user_id` - Изменить роль участника
- `DELETE /api/v1/chats/:id/members/:user_id` - Удалить участника из чата

### Сообщения
- `GET /api/v1/chats/:id/messages` - Получить историю сообщений
- `POST /api/v1/chats/:id/messages` - Отправить сообщение
- `PUT /api/v1/chats/:chat_id/messages/:message_id` - Редактировать сообщение
- `DELETE /api/v1/chats/:chat_id/messages/:message_id` - Удалить сообщение
- `PUT /api/v1/chats/:id/messages/read` - Отметить сообщения как прочитанные

### WebSocket
- `WS /api/v1/chats/ws?token=<jwt_token>` - WebSocket соединение для real-time общения

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

## Запуск

### Локально

```bash
# Установить зависимости
go mod download

# Запустить сервис
go run main.go
```

### Docker

```bash
# Собрать образ
docker build -t chat-service .

# Запустить контейнер
docker run -p 8084:8084 \
  -e PORT=8084 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=messenger_db \
  -e DB_USER=user \
  -e DB_PASSWORD=password \
  chat-service
```

### Docker Compose

```bash
cd server/src
docker-compose up chat-service
```

## Генерация Swagger документации

```bash
make swagger
```

Или вручную:

```bash
swag init -g main.go -o docs --parseDependency --parseInternal
```

## Переменные окружения

- `PORT` - Порт сервиса (по умолчанию: 8084)
- `DB_HOST` - Хост базы данных (по умолчанию: postgres)
- `DB_PORT` - Порт базы данных (по умолчанию: 5432)
- `DB_NAME` - Имя базы данных (по умолчанию: messenger_db)
- `DB_USER` - Пользователь БД (по умолчанию: user)
- `DB_PASSWORD` - Пароль БД (по умолчанию: password)
- `AUTH_SERVICE_URL` - URL сервиса аутентификации
- `USER_SERVICE_URL` - URL сервиса пользователей
- `WORKSPACE_SERVICE_URL` - URL сервиса рабочих пространств
- `WEBSOCKET_ENABLED` - Включить WebSocket (по умолчанию: true)
- `WEBSOCKET_PING_INTERVAL` - Интервал ping в секундах (по умолчанию: 30)




























