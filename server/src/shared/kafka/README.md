# Shared Kafka Library

Общая библиотека для работы с Apache Kafka в микросервисной архитектуре корпоративного мессенджера.

## Компоненты

### Producer
Синхронный продюсер для отправки сообщений в Kafka топики.

```go
producer, err := kafka.NewProducer([]string{"localhost:9092"})
if err != nil {
    log.Fatal(err)
}
defer producer.Close()

event := kafka.ComplaintStatusChangedEvent{
    ComplaintID: 1,
    NewStatus: "resolved",
    // ... остальные поля
}

err = producer.Publish(kafka.TopicComplaintStatusChanged, event)
```

### Consumer
Консьюмер для подписки на топики и обработки сообщений.

```go
consumer, err := kafka.NewConsumer([]string{"localhost:9092"})
if err != nil {
    log.Fatal(err)
}
defer consumer.Close()

handler := func(topic string, message []byte) error {
    var event kafka.ComplaintStatusChangedEvent
    if err := json.Unmarshal(message, &event); err != nil {
        return err
    }

    // Обработка события
    return sendEmailNotification(event)
}

err = consumer.Subscribe(kafka.TopicComplaintStatusChanged, handler)
```

## События

### ComplaintStatusChangedEvent
Отправляется при изменении статуса жалобы администратором.

Поля:
- `complaint_id`: ID жалобы
- `old_status`: Предыдущий статус
- `new_status`: Новый статус
- `comment`: Комментарий администратора
- `changed_by`: ID администратора
- `changed_by_login`: Логин администратора
- `user_email`: Email пользователя
- `user_name`: Имя пользователя
- `complaint_text`: Текст жалобы
- `device_description`: Описание устройства
- `changed_at`: Время изменения

## Топики

- `complaints.status.changed`: Изменение статуса жалоб







