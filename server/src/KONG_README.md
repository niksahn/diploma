# Kong Gateway Setup

Этот документ описывает настройку и использование Kong Gateway для корпоративного мессенджера.

## Обзор архитектуры

```
Клиент → Kong Gateway (порт 8080) → Микросервисы
                                    ↓
                            Kong Manager (порт 8002)
                            Kong Admin API (порт 8001)
```

## Быстрый старт

### 1. Запуск всех сервисов

```bash
cd server/src
docker-compose up -d
```

### 2. Проверка статуса

**Kong Gateway:**
- **API Gateway**: http://localhost:8080
- **Kong Manager**: http://localhost:8002
- **Admin API**: http://localhost:8001

**Микросервисы:**
- Auth Service: http://localhost:8081
- User Service: http://localhost:8082
- Workspace Service: http://localhost:8083
- Chat Service: http://localhost:8084

### 3. Проверка health check

```bash
curl http://localhost:8080/health
```

## Kong Plugins

### Активные плагины по сервисам

| Сервис | JWT | Request Transformer | Rate Limiting | CORS | Prometheus |
|--------|-----|-------------------|---------------|------|------------|
| auth-service | ❌ | ❌ | ✅ (5/min) | ✅ | ❌ |
| user-service | ✅ | ✅ | ✅ (100/min) | ✅ | ✅ |
| workspace-service | ✅ | ✅ | ✅ (100/min) | ✅ | ✅ |
| chat-service | ✅ | ✅ | ✅ (100/min) | ✅ | ✅ |

### JWT Plugin

- **Валидирует** JWT токены из заголовка `Authorization: Bearer <token>`
- **Извлекает claims**: `user_id`, `role`, `exp`
- **Публичные роуты**: `/api/v1/auth/*`, `/health`

### Request Transformer Plugin

- **Добавляет заголовки** для downstream сервисов:
  - `X-User-ID`: ID пользователя из JWT
  - `X-User-Role`: роль пользователя (`user` или `admin`)

### Rate Limiting Plugin

- **Auth endpoints**: 5 запросов в минуту
- **Защищенные сервисы**: 100 запросов в минуту
- **Политика**: `local` (in-memory)

### CORS Plugin

- **Разрешенные origins**: `http://localhost:3000`, `https://messenger.example.com`
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Authorization, Content-Type

### Prometheus Plugin

- **Метрики endpoint**: `http://localhost:8080/metrics`
- **Основные метрики**:
  - `kong_http_requests_total`
  - `kong_http_requests_duration_ms`
  - `kong_ratelimiting_rate_limited`

## Тестирование API

### 1. Регистрация пользователя

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "login": "testuser",
    "password": "password123",
    "surname": "Test",
    "name": "User"
  }'
```

### 2. Вход в систему

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "testuser",
    "password": "password123"
  }'
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "login": "testuser",
    "name": "User"
  }
}
```

### 3. Защищенный запрос (с JWT)

```bash
curl -X GET http://localhost:8080/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Что происходит:**
1. Kong валидирует JWT
2. Извлекает `user_id` и `role` из токена
3. Добавляет заголовки `X-User-ID` и `X-User-Role`
4. Проксирует запрос к user-service

### 4. Rate Limiting тест

```bash
# Быстрые последовательные запросы к auth endpoint
for i in {1..6}; do
  curl -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login": "test", "password": "test"}'
done
```

После 5 запросов получите `429 Too Many Requests`.

## Kong Manager

### Доступ к веб-интерфейсу

1. Откройте: http://localhost:8002
2. **Default credentials**:
   - Username: `kong_admin`
   - Password: генерируется автоматически (смотрите логи Kong)

### Просмотр конфигурации

- **Services**: список всех upstream сервисов
- **Routes**: маршруты к сервисам
- **Plugins**: активные плагины
- **Upstreams**: health check статус сервисов

## Kong Admin API

### Просмотр всех сервисов

```bash
curl http://localhost:8001/services
```

### Просмотр роутов

```bash
curl http://localhost:8001/routes
```

### Просмотр плагинов

```bash
curl http://localhost:8001/plugins
```

### Мониторинг метрик

```bash
curl http://localhost:8080/metrics
```

## Troubleshooting

### Kong не запускается

**Проверьте логи:**
```bash
docker-compose logs kong
```

**Возможные проблемы:**
- Kong database не готова
- Неправильная конфигурация в `kong.yml`
- Конфликт портов

### 502 Bad Gateway

Сервис недоступен:
```bash
# Проверьте статус сервиса
docker-compose ps

# Проверьте логи сервиса
docker-compose logs auth-service
```

### JWT ошибки

- `401 Unauthorized`: токен отсутствует или невалиден
- `403 Forbidden`: токен истек

**Проверьте токен:**
```bash
# Раскодируйте JWT payload
echo "YOUR_JWT_TOKEN" | cut -d'.' -f2 | base64 -d
```

## Конфигурация для production

### Environment Variables

```bash
# Kong
KONG_ADMIN_GUI_AUTH=basic-auth
KONG_ADMIN_GUI_SESSION_CONF={"cookie_secure":true}

# Database
KONG_PG_SSL=on
KONG_PG_SSL_VERIFY=on

# Security
KONG_TRUSTED_IPS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

### SSL/TLS

```yaml
# kong.yml
services:
  - name: ssl-service
    # ... конфигурация SSL
    plugins:
      - name: tls-handshake-modifier
        config:
          tls_version: TLSv1.3
```

## Структура файлов

```
server/src/
├── docker-compose.yml    # Конфигурация всех сервисов
├── kong.yml             # Declarative конфигурация Kong
├── KONG_README.md       # Этот файл
└── services/            # Исходный код микросервисов
```

## Следующие шаги

1. **Реализовать task-service** и **complaint-service**
2. **Добавить monitoring** (Grafana + Prometheus)
3. **Настроить SSL** для production
4. **Добавить API versioning**
5. **Настроить Kong Enterprise** для расширенных функций

## Документация

- [Kong Gateway Docs](https://docs.konghq.com/gateway/latest/)
- [Kong Plugin Hub](https://docs.konghq.com/hub/)
- [Kong Manager Guide](https://docs.konghq.com/gateway/latest/kong-manager/)

## Swagger API Documentation

Kong Gateway предоставляет полную Swagger документацию для всех API.

### Доступ к документации

- **Объединенная Swagger UI**: http://localhost:8089
- **Отдельные сервисы**:
  - Auth Service: http://localhost:8080/swagger/auth/
  - User Service: http://localhost:8080/swagger/user/
  - Workspace Service: http://localhost:8080/swagger/workspace/
  - Chat Service: http://localhost:8080/swagger/chat/
  - Kong Gateway: http://localhost:8080/swagger/kong.json

### Объединенная документация

Swagger UI на порту 8089 предоставляет:
- **Все API сервисы** в одном интерфейсе
- **Переключение между сервисами** через dropdown
- **Try it out** функциональность для тестирования
- **Авторизация** через JWT токены

### Использование Swagger UI

1. **Открыть**: http://localhost:8089
2. **Выбрать сервис** из списка
3. **Авторизоваться** (для защищенных эндпоинтов):
   - Нажать "Authorize"
   - Ввести: `Bearer <your_jwt_token>`
4. **Тестировать эндпоинты** с помощью "Try it out"

### Kong Admin API

Kong Admin API также документирован:
- **Swagger JSON**: http://localhost:8080/swagger/kong.json
- **Включает эндпоинты для**:
  - Управления сервисами и роутами
  - Мониторинга плагинов
  - Проверки upstream health

---

**API Documentation**: [server/plans/api/gateway.md](../plans/api/gateway.md)
