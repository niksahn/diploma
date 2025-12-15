# Chat Service Tests

Функциональные (интеграционные) тесты для Chat Service.

## Покрытие эндпоинтов

### Чаты (5 эндпоинтов)

1. **POST /api/v1/chats** - Создание чата
   - ✅ Успешное создание группового чата
   - ✅ Успешное создание личного чата
   - ✅ Успешное создание канала
   - ✅ Ошибка 401 - без токена
   - ✅ Ошибка 404 - несуществующее РП
   - ✅ Ошибка 400 - невалидные данные (короткое имя, неправильное количество участников)

2. **GET /api/v1/chats** - Получение списка чатов
   - ✅ Успешное получение списка
   - ✅ Фильтр по РП
   - ✅ Фильтр по типу чата
   - ✅ Ошибка 401 - без токена

3. **GET /api/v1/chats/:id** - Получение информации о чате
   - ✅ Успешное получение
   - ✅ Ошибка 403 - не является участником
   - ✅ Ошибка 404 - чат не найден

4. **PUT /api/v1/chats/:id** - Обновление чата
   - ✅ Успешное обновление администратором
   - ✅ Ошибка 403 - обычным участником

5. **DELETE /api/v1/chats/:id** - Удаление чата
   - ✅ Успешное удаление администратором
   - ✅ Ошибка 403 - обычным участником

### Участники чата (4 эндпоинта)

6. **POST /api/v1/chats/:id/members** - Добавление участников
   - ✅ Успешное добавление администратором
   - ✅ Ошибка 403 - обычным участником

7. **GET /api/v1/chats/:id/members** - Получение списка участников
   - ✅ Успешное получение

8. **PUT /api/v1/chats/:id/members/:user_id** - Изменение роли участника
   - ✅ Успешное изменение администратором

9. **DELETE /api/v1/chats/:id/members/:user_id** - Удаление участника
   - ✅ Успешное удаление администратором

### Сообщения (5 эндпоинтов)

10. **GET /api/v1/chats/:id/messages** - История сообщений
    - ✅ Успешное получение истории

11. **POST /api/v1/chats/:id/messages** - Отправка сообщения
    - ✅ Успешная отправка

12. **PUT /api/v1/chats/:chat_id/messages/:message_id** - Редактирование сообщения
    - ✅ Успешное редактирование

13. **DELETE /api/v1/chats/:chat_id/messages/:message_id** - Удаление сообщения
    - ✅ Успешное удаление

14. **PUT /api/v1/chats/:id/messages/read** - Отметить как прочитанное
    - ✅ Успешная отметка

### WebSocket (1 эндпоинт)

15. **WS /api/v1/chats/ws** - WebSocket соединение
    - ✅ Успешное подключение
    - ✅ Подключение с невалидным токеном
    - ✅ Подключение без токена
    - ✅ Присоединение и выход из чата
    - ✅ Отправка сообщения через WebSocket
    - ✅ Индикатор печати (typing)
    - ✅ Ошибка при присоединении к чужому чату
    - ✅ Ошибка при отправке сообщения в канал как обычный участник

## Структура тестов

```
tests/services/chat/
├── __init__.py
├── conftest.py                    # Фикстуры для тестов
├── test_chat_endpoints.py         # Тесты REST эндпоинтов
├── test_websocket.py              # Тесты WebSocket соединений
└── README.md                      # Этот файл
```

## Классы тестов

### REST API тесты (test_chat_endpoints.py)

- **TestChatCreation** - Тесты создания чатов
- **TestChatList** - Тесты получения списка чатов
- **TestChatInfo** - Тесты получения информации о чате
- **TestChatUpdate** - Тесты обновления чата
- **TestChatDelete** - Тесты удаления чата
- **TestChatMembers** - Тесты управления участниками
- **TestMessages** - Тесты работы с сообщениями

### WebSocket тесты (test_websocket.py)

- **TestWebSocketConnection** - Тесты подключения к WebSocket
- **TestWebSocketChatEvents** - Тесты событий чата через WebSocket

## Фикстуры

### Из conftest.py

- `chat_service_url` - URL Chat Service
- `chat_api_path` - Базовый путь API
- `auth_service_url` - URL Auth Service
- `auth_api_path` - Базовый путь Auth API
- `workspace_service_url` - URL Workspace Service
- `workspace_api_path` - Базовый путь Workspace API
- `db_connection` - Соединение с БД
- `db_cursor` - Курсор БД
- `clean_chat_data` - Очистка данных после теста
- `admin_token` - Токен администратора
- `user_token` - Токен обычного пользователя (с user_id)
- `multiple_users` - Список из 5 пользователей с токенами
- `workspace_with_members` - Рабочее пространство с участниками

### Из корневого conftest.py

- `unique_timestamp` - Уникальный timestamp для генерации данных
- `base_url` - URL Auth Service
- `api_path` - Базовый путь Auth API

## Запуск тестов

### Все тесты Chat Service

```bash
pytest tests/services/chat/ -v
```

### Только REST API тесты

```bash
pytest tests/services/chat/test_chat_endpoints.py -v
```

### Только WebSocket тесты

```bash
pytest tests/services/chat/test_websocket.py -v
```

### Конкретный класс тестов

```bash
pytest tests/services/chat/test_chat_endpoints.py::TestChatCreation -v
```

### Конкретный тест

```bash
pytest tests/services/chat/test_chat_endpoints.py::TestChatCreation::test_create_group_chat_success -v
```

## Переменные окружения

```bash
CHAT_SERVICE_URL=http://localhost:8084
AUTH_SERVICE_URL=http://localhost:8081
WORKSPACE_SERVICE_URL=http://localhost:8083
DB_HOST=localhost
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password
```

## Зависимости

- pytest
- requests
- psycopg2-binary
- websocket-client (для WebSocket тестов)

## Примечания

1. Тесты требуют запущенных сервисов:
   - Auth Service (для аутентификации)
   - Workspace Service (для создания РП)
   - Chat Service (тестируемый сервис)
   - PostgreSQL (база данных)

2. Тесты используют реальную БД, но очищают созданные данные после выполнения

3. Каждый тест независим и может выполняться отдельно

4. Используются уникальные timestamp для избежания конфликтов данных

5. WebSocket тесты требуют стабильного соединения и могут быть чувствительны к таймаутам

## Покрытие

- **Всего эндпоинтов**: 15 REST + 1 WebSocket = 16
- **Покрыто тестами**: 16 (100%)
- **Всего тест-кейсов**: 40+
- **Типы тестов**:
  - Happy path (успешные сценарии)
  - Обработка ошибок (401, 403, 404, 400)
  - Валидация данных
  - Проверка прав доступа
  - WebSocket события и real-time общение




















