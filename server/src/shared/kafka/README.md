# Kafka Infrastructure for Complaints

Общая библиотека для работы с Apache Kafka в корпоративном мессенджере.

## 🚀 Быстрый старт

### 1. Запуск инфраструктуры
```bash
cd server/src
docker-compose up -d zookeeper kafka kafka-ui
```

### 2. Создание топиков
```bash
./scripts/init-kafka-topics.sh
```

### 3. Проверка работы
```bash
cd test-kafka-producer
go run main.go
```

### 4. Просмотр сообщений в UI
Открыть http://localhost:8087 и перейти в раздел Topics → complaint-events

## 📁 Структура

```
shared/kafka/
├── config.go         # Конфигурация подключения
├── models.go         # Модели событий
├── producer.go       # Отправка сообщений
├── consumer.go       # Получение сообщений
├── tests/            # Unit тесты
└── README.md         # Эта документация
```

## 🎯 Топики

| Топик | Назначение | Партиции | Репликация |
|-------|------------|----------|------------|
| `complaint-events` | События жалоб (создание, изменение статуса) | 3 | 1 |
| `complaint-notifications` | Уведомления для отправки | 3 | 1 |
| `complaint-analytics` | Данные для аналитики | 3 | 1 |

## 📨 События

### ComplaintCreatedEvent
Отправляется при создании новой жалобы.

```json
{
  "id": "uuid",
  "type": "complaint_created",
  "timestamp": "2025-12-11T...",
  "service": "complaint-service",
  "version": "1.0",
  "complaint_id": 1,
  "author_id": 1,
  "author_name": "John Doe",
  "author_email": "john@example.com",
  "text": "Application crashes...",
  "device_description": "Windows 10",
  "status": "pending",
  "created_at": "2025-12-11T..."
}
```

### ComplaintStatusChangedEvent
Отправляется при изменении статуса жалобы.

```json
{
  "id": "uuid",
  "type": "complaint_status_changed",
  "timestamp": "2025-12-11T...",
  "service": "complaint-service",
  "version": "1.0",
  "complaint_id": 1,
  "old_status": "pending",
  "new_status": "resolved",
  "changed_by": 123,
  "changed_by_name": "Admin User",
  "comment": "Fixed in v1.2.3",
  "author_id": 1,
  "author_email": "john@example.com",
  "changed_at": "2025-12-11T..."
}
```

## 🔧 Конфигурация

### Переменные окружения
```bash
# Kafka brokers
KAFKA_BROKERS=localhost:9092

# Client settings
KAFKA_CLIENT_ID=messenger-service

# Topics
KAFKA_TOPIC_COMPLAINTS=complaint-events
KAFKA_TOPIC_NOTIFICATIONS=complaint-notifications
KAFKA_TOPIC_ANALYTICS=complaint-analytics

# Producer settings
KAFKA_PRODUCER_MAX_RETRIES=3
KAFKA_PRODUCER_RETRY_BACKOFF=100ms
KAFKA_PRODUCER_FLUSH_TIMEOUT=10s

# Consumer settings
KAFKA_CONSUMER_GROUP_ID=messenger-group
KAFKA_CONSUMER_SESSION_TIMEOUT=10s
KAFKA_CONSUMER_HEARTBEAT_INTERVAL=3s
KAFKA_CONSUMER_MAX_PROCESSING_TIME=300s
```

## 🧪 Тестирование

### Unit тесты
```bash
cd shared/kafka
go test ./tests -v
```

### Интеграционные тесты
```bash
cd test-kafka-producer
go run main.go
```

### Проверка через консоль
```bash
# Просмотр топиков
docker exec messenger_kafka kafka-topics --list --bootstrap-server localhost:9092

# Чтение сообщений
docker exec messenger_kafka kafka-console-consumer \
  --topic complaint-events \
  --bootstrap-server localhost:9092 \
  --from-beginning
```

## 🔍 Мониторинг

- **Kafka UI**: http://localhost:8087
- **Логи контейнеров**: `docker logs messenger_kafka`
- **Метрики**: Встроенные метрики Kafka + Prometheus (будет добавлено)

## 📚 Следующие шаги

1. **Notification Service** - обработка уведомлений из Kafka
2. **Analytics Service** - сбор статистики жалоб
3. **Интеграция в Complaint Service** - отправка событий
4. **Мониторинг и алерты** - Prometheus + Grafana

---

## 🔗 Ссылки

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Sarama Go Client](https://github.com/Shopify/sarama)
- [Kafka UI](https://github.com/provectuslabs/kafka-ui)
