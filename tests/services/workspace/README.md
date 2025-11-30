# Workspace Service Tests

Функциональные (интеграционные) тесты для Workspace Service.

## Покрытие эндпоинтов

### Рабочие пространства (5 эндпоинтов)

1. **POST /api/v1/workspaces** - Создание рабочего пространства
   - ✅ Успешное создание администратором
   - ✅ Ошибка 401 - без токена
   - ✅ Ошибка 403 - обычным пользователем
   - ✅ Ошибка 400 - невалидные данные
   - ✅ Ошибка 409 - дублирующееся имя

2. **GET /api/v1/workspaces** - Получение списка РП пользователя
   - ✅ Успешное получение списка

3. **GET /api/v1/workspaces/:id** - Получение информации о РП
   - ✅ Успешное получение
   - ✅ Ошибка 403 - не является участником
   - ✅ Ошибка 404 - РП не найдено

4. **PUT /api/v1/workspaces/:id** - Обновление РП
   - ✅ Успешное обновление руководителем
   - ✅ Ошибка 403 - обычным участником

5. **DELETE /api/v1/workspaces/:id** - Удаление РП
   - ✅ Успешное удаление администратором
   - ✅ Ошибка 403 - обычным пользователем

### Участники РП (4 эндпоинта)

6. **POST /api/v1/workspaces/:id/members** - Добавление участника
   - ✅ Успешное добавление руководителем
   - ✅ Ошибка 403 - обычным участником
   - ✅ Ошибка 409 - пользователь уже участник

7. **GET /api/v1/workspaces/:id/members** - Получение списка участников
   - ✅ Успешное получение
   - ✅ Ошибка 403 - не является участником

8. **PUT /api/v1/workspaces/:id/members/:user_id** - Изменение роли участника
   - ✅ Успешное изменение руководителем
   - ✅ Ошибка 403 - обычным участником

9. **DELETE /api/v1/workspaces/:id/members/:user_id** - Удаление участника
   - ✅ Успешное удаление руководителем
   - ✅ Ошибка 403 - обычным участником

### Смена руководителя (1 эндпоинт)

10. **PUT /api/v1/workspaces/:id/leader** - Смена руководителя
    - ✅ Успешная смена текущим руководителем
    - ✅ Ошибка 403 - обычным участником
    - ✅ Ошибка 404 - новый руководитель не участник

### Тарифы (3 эндпоинта)

11. **GET /api/v1/workspaces/tariffs** - Получение списка тарифов
    - ✅ Успешное получение (публичный эндпоинт)

12. **POST /api/v1/workspaces/tariffs** - Создание тарифа
    - ✅ Успешное создание администратором
    - ✅ Ошибка 401 - без токена
    - ✅ Ошибка 403 - обычным пользователем
    - ✅ Ошибка 409 - дублирующееся имя

13. **PUT /api/v1/workspaces/tariffs/:id** - Обновление тарифа
    - ✅ Успешное обновление администратором
    - ✅ Ошибка 403 - обычным пользователем
    - ✅ Ошибка 404 - тариф не найден

## Структура тестов

```
tests/services/workspace/
├── __init__.py
├── conftest.py                    # Фикстуры для тестов
└── test_workspace_endpoints.py    # Основные тесты
```

## Классы тестов

- **TestWorkspaceManagement** - Тесты управления рабочими пространствами
- **TestWorkspaceMembers** - Тесты управления участниками
- **TestWorkspaceLeader** - Тесты смены руководителя
- **TestTariffs** - Тесты управления тарифами

## Фикстуры

### Из conftest.py

- `workspace_service_url` - URL Workspace Service
- `workspace_api_path` - Базовый путь API
- `auth_service_url` - URL Auth Service
- `auth_api_path` - Базовый путь Auth API
- `db_connection` - Соединение с БД
- `db_cursor` - Курсор БД
- `clean_workspace_data` - Очистка данных после теста
- `admin_token` - Токен администратора
- `user_token` - Токен обычного пользователя (с user_id)
- `tariff_id` - ID тестового тарифа
- `workspace_data` - Данные для создания РП

### Из корневого conftest.py

- `unique_timestamp` - Уникальный timestamp для генерации данных
- `base_url` - URL Auth Service
- `api_path` - Базовый путь Auth API

## Запуск тестов

### Все тесты Workspace Service

```bash
pytest tests/services/workspace/ -v
```

### Конкретный класс тестов

```bash
pytest tests/services/workspace/test_workspace_endpoints.py::TestWorkspaceManagement -v
```

### Конкретный тест

```bash
pytest tests/services/workspace/test_workspace_endpoints.py::TestWorkspaceManagement::test_create_workspace_success -v
```

## Переменные окружения

```bash
WORKSPACE_SERVICE_URL=http://localhost:8083
AUTH_SERVICE_URL=http://localhost:8081
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

## Примечания

1. Тесты требуют запущенных сервисов:
   - Auth Service (для аутентификации)
   - Workspace Service (тестируемый сервис)
   - PostgreSQL (база данных)

2. Тесты используют реальную БД, но очищают созданные данные после выполнения

3. Каждый тест независим и может выполняться отдельно

4. Используются уникальные timestamp для избежания конфликтов данных

## Покрытие

- **Всего эндпоинтов**: 12
- **Покрыто тестами**: 12 (100%)
- **Всего тест-кейсов**: 35+
- **Типы тестов**:
  - Happy path (успешные сценарии)
  - Обработка ошибок (401, 403, 404, 409)
  - Валидация данных
  - Проверка прав доступа
