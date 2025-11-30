# Workspace Service

Микросервис управления рабочими пространствами для корпоративного мессенджера.

## Описание

Workspace Service отвечает за:
- Создание и управление рабочими пространствами
- Управление участниками и их ролями
- Управление тарифными планами
- Контроль доступа к рабочим пространствам

## Технологии

- **Go 1.21+**
- **Gin** - HTTP фреймворк
- **PostgreSQL** - база данных
- **pgx/v5** - драйвер PostgreSQL
- **Swagger** - документация API

## Структура проекта

```
workspace/
├── config/              # Конфигурация
├── data/
│   ├── database/        # Подключение к БД
│   ├── models/          # Модели данных
│   └── repository/      # Репозиторий для работы с БД
├── presentation/
│   ├── handlers/        # HTTP обработчики
│   └── models/          # Request/Response модели
├── docs/                # Swagger документация
├── main.go              # Точка входа
├── Dockerfile           # Docker образ
├── Makefile             # Команды для разработки
└── README.md            # Документация
```

## API Endpoints

### Рабочие пространства

- `POST /api/v1/workspaces` - Создать РП (администратор)
- `GET /api/v1/workspaces` - Список РП пользователя
- `GET /api/v1/workspaces/:id` - Информация о РП
- `PUT /api/v1/workspaces/:id` - Обновить РП (руководитель)
- `DELETE /api/v1/workspaces/:id` - Удалить РП (администратор)

### Участники

- `POST /api/v1/workspaces/:id/members` - Добавить участника (руководитель)
- `GET /api/v1/workspaces/:id/members` - Список участников
- `PUT /api/v1/workspaces/:id/members/:user_id` - Изменить роль (руководитель)
- `DELETE /api/v1/workspaces/:id/members/:user_id` - Удалить участника (руководитель)
- `PUT /api/v1/workspaces/:id/leader` - Сменить руководителя (текущий руководитель)

### Тарифы

- `GET /api/v1/workspaces/tariffs` - Список тарифов (публичный)
- `POST /api/v1/workspaces/tariffs` - Создать тариф (администратор)
- `PUT /api/v1/workspaces/tariffs/:id` - Обновить тариф (администратор)

## Переменные окружения

```bash
PORT=8083                                    # Порт сервиса
DB_HOST=postgres                             # Хост БД
DB_PORT=5432                                 # Порт БД
DB_NAME=messenger_db                         # Имя БД
DB_USER=user                                 # Пользователь БД
DB_PASSWORD=password                         # Пароль БД
AUTH_SERVICE_URL=http://localhost:8081       # URL Auth Service
USER_SERVICE_URL=http://localhost:8082       # URL User Service
```

## Роли в рабочем пространстве

| Код | Роль | Права |
|-----|------|-------|
| 1 | Участник | Просмотр, создание задач и чатов |
| 2 | Руководитель | Все права участника + управление РП, добавление/удаление участников |

## Запуск

### Локально

```bash
# Установить зависимости
go mod download

# Запустить сервис
go run main.go

# Или через Makefile
make run
```

### Docker

```bash
# Собрать образ
docker build -t workspace-service .

# Запустить контейнер
docker run -p 8083:8083 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=messenger_db \
  -e DB_USER=user \
  -e DB_PASSWORD=password \
  workspace-service
```

### Docker Compose

Сервис интегрирован в общий `docker-compose.yml` проекта.

## Swagger документация

После запуска сервиса документация доступна по адресу:
```
http://localhost:8083/swagger/index.html
```

Для генерации/обновления документации:
```bash
make swagger
# или
swag init -g main.go
```

## Разработка

### Генерация Swagger документации

```bash
# Установить swag (если еще не установлен)
go install github.com/swaggo/swag/cmd/swag@latest

# Сгенерировать документацию
swag init -g main.go
```

### Сборка

```bash
# Локальная сборка
make build

# Или напрямую
go build -o workspace-service main.go
```

## Зависимости от других сервисов

- **PostgreSQL** - основная база данных
- **Auth Service** - валидация JWT токенов (через Gateway)
- **User Service** - проверка существования пользователей

## Примечания

1. Администратор может создавать РП и назначать любого пользователя руководителем
2. Руководитель РП имеет права на управление участниками и настройками
3. При создании РП указанный leader автоматически добавляется как участник с ролью 2
4. Нельзя удалить последнего руководителя РП
5. Тарифы определяют возможности РП (лимиты на количество участников, чатов, хранилище и т.д.)
6. При удалении РП каскадно удаляются все связанные чаты, задачи и участники

## Лицензия

Apache 2.0
