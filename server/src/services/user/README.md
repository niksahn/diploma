# User Service

Микросервис управления пользователями для корпоративного мессенджера.

## Описание

User Service отвечает за:
- Управление профилями пользователей
- Обновление статусов пользователей
- Поиск пользователей с фильтрацией
- Получение списка пользователей рабочего пространства

## Технологии

- **Go 1.23+**
- **Gin** - HTTP веб-фреймворк
- **pgx/v5** - PostgreSQL драйвер
- **swaggo/swag** - Swagger документация

## Структура проекта

```
user/
├── main.go                    # Точка входа
├── config/                    # Конфигурация
│   └── config.go
├── data/                      # Слой данных
│   ├── database/             # Подключение к БД
│   │   └── database.go
│   ├── models/               # Модели данных БД
│   │   └── models.go
│   └── repository/            # Слой доступа к данным
│       └── repository.go
├── presentation/             # Слой представления
│   ├── handlers/             # HTTP обработчики
│   │   └── user_handler.go
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

### Профиль пользователя

- `GET /api/v1/users/me` - Получить профиль текущего пользователя
- `PUT /api/v1/users/me` - Обновить профиль текущего пользователя
- `GET /api/v1/users/:id` - Получить профиль пользователя по ID
- `PUT /api/v1/users/:id` - Обновить данные пользователя (только для руководителя РП)

### Статус пользователя

- `PUT /api/v1/users/me/status` - Обновить статус текущего пользователя

### Поиск и список

- `GET /api/v1/users` - Поиск пользователей с фильтрацией и пагинацией
- `GET /api/v1/users/workspace/:workspace_id` - Получить всех пользователей рабочего пространства

Подробная документация доступна в Swagger UI после запуска сервиса: `http://localhost:8082/swagger/index.html`

## Конфигурация

### Environment Variables

```bash
PORT=8082                    # Порт сервиса
DB_HOST=postgres            # Хост БД
DB_PORT=5432                # Порт БД
DB_NAME=messenger_db        # Имя БД
DB_USER=user                # Пользователь БД
DB_PASSWORD=password        # Пароль БД
```

## Запуск

### Локальная разработка

```bash
# Установить зависимости
go mod download

# Запустить сервис
make run
# или
go run main.go
```

### Docker

```bash
# Собрать образ
docker build -t user-service .

# Запустить контейнер
docker run -p 8082:8082 \
  -e PORT=8082 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=messenger_db \
  -e DB_USER=user \
  -e DB_PASSWORD=password \
  user-service
```

### Docker Compose

```bash
cd server/src
docker-compose up user-service
```

## Генерация Swagger документации

```bash
make swagger
# или
swag init -g main.go -o docs --parseDependency --parseInternal
```

## Особенности

1. **Без авторизации**: User Service не проверяет JWT токены самостоятельно. Проверка токена выполняется на уровне API Gateway, который добавляет `X-User-ID` в заголовок запроса.

2. **Чистая архитектура**: Сервис организован по принципам чистой архитектуры с разделением на слои:
   - `data/` - слой данных (БД, репозитории, модели БД)
   - `presentation/` - слой представления (handlers, DTO)

3. **Статусы пользователей**:
   - 1 = Онлайн
   - 2 = Не беспокоить
   - 3 = Отошел
   - 4 = Офлайн

4. **Права доступа**:
   - Обновление профиля другого пользователя доступно только руководителям РП, где состоит целевой пользователь
   - Просмотр пользователей рабочего пространства доступен только участникам этого РП

## Health Check

```bash
curl http://localhost:8082/health
```

Ответ:
```json
{
  "status": "ok",
  "service": "user-service"
}
```














