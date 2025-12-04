# Complaint Service

**Статус**: ⬜ Не реализован

**Порт**: `8086`

**Префикс**: `/api/v1/complaints`

---

## Описание

Complaint Service обрабатывает жалобы пользователей на проблемы и ошибки в приложении. Администраторы могут просматривать и управлять жалобами.

---

## Эндпоинты (5)

### Жалобы

#### `POST /api/v1/complaints`

Создать новую жалобу.

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "text": "Application crashes when uploading large files",
  "device_description": "Windows 10, Chrome 120.0, 16GB RAM"
}
```

**Validation**:
- `text`: обязательно, 10-255 символов
- `device_description`: обязательно, до 255 символов

**Response**: `201 Created`
```json
{
  "id": 1,
  "text": "Application crashes when uploading large files",
  "date": "2024-01-01",
  "device_description": "Windows 10, Chrome 120.0, 16GB RAM",
  "author": 1,
  "author_name": "Ivan Ivanov",
  "status": "pending",
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Errors**:
- `400` - Невалидные данные
- `401` - Не авторизован

**Note**: Статус по умолчанию - "pending" (ожидает рассмотрения).

---

#### `GET /api/v1/complaints`

Получить список жалоб.

**Headers**: `Authorization: Bearer <token>`

**Query params**:
- `status` - фильтр по статусу (pending/in_progress/resolved/rejected) [опционально]
- `author_id` - фильтр по автору [опционально, только для администратора]
- `limit` - лимит результатов (по умолчанию 50)
- `offset` - смещение для пагинации

**Поведение**:
- **Пользователь**: видит только свои жалобы
- **Администратор**: видит все жалобы

**Example**: `/api/v1/complaints?status=pending&limit=20`

**Response**: `200 OK`
```json
{
  "complaints": [
    {
      "id": 1,
      "text": "Application crashes when uploading large files",
      "date": "2024-01-01",
      "device_description": "Windows 10, Chrome 120.0, 16GB RAM",
      "author": 1,
      "author_name": "Ivan Ivanov",
      "status": "pending",
      "created_at": "2024-01-01T12:00:00Z"
    },
    {
      "id": 2,
      "text": "Unable to send messages in chat",
      "date": "2024-01-02",
      "device_description": "macOS 14, Safari 17.0",
      "author": 3,
      "author_name": "Petr Petrov",
      "status": "in_progress",
      "created_at": "2024-01-02T10:00:00Z",
      "assigned_to": "Admin",
      "updated_at": "2024-01-02T11:00:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Errors**:
- `400` - Невалидные параметры
- `401` - Не авторизован

---

#### `GET /api/v1/complaints/:id`

Получить детальную информацию о жалобе.

**Headers**: `Authorization: Bearer <token>`

**Path params**:
- `id` - ID жалобы

**Response**: `200 OK`
```json
{
  "id": 1,
  "text": "Application crashes when uploading large files",
  "date": "2024-01-01",
  "device_description": "Windows 10, Chrome 120.0, 16GB RAM",
  "author": 1,
  "author_name": "Ivan Ivanov",
  "author_login": "ivan@example.com",
  "status": "in_progress",
  "status_history": [
    {
      "status": "in_progress",
      "comment": "Investigating the issue",
      "changed_by": "Admin",
      "changed_at": "2024-01-01T14:00:00Z"
    },
    {
      "status": "pending",
      "changed_at": "2024-01-01T12:00:00Z"
    }
  ],
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T14:00:00Z"
}
```

**Errors**:
- `401` - Не авторизован
- `403` - Пользователь не является автором и не администратор
- `404` - Жалоба не найдена

---

#### `PUT /api/v1/complaints/:id/status`

Изменить статус жалобы (только администратор).

**Headers**: `Authorization: Bearer <admin_token>`

**Path params**:
- `id` - ID жалобы

**Body**:
```json
{
  "status": "resolved",
  "comment": "Issue fixed in version 1.2.3"
}
```

**Validation**:
- `status`: pending/in_progress/resolved/rejected
- `comment`: опционально, до 500 символов

**Response**: `200 OK`
```json
{
  "id": 1,
  "status": "resolved",
  "comment": "Issue fixed in version 1.2.3",
  "changed_by": "Admin",
  "changed_at": "2024-01-03T00:00:00Z"
}
```

**Errors**:
- `400` - Невалидный статус
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор)
- `404` - Жалоба не найдена

**Note**: Изменение статуса добавляется в историю.

---

#### `DELETE /api/v1/complaints/:id`

Удалить жалобу (только администратор).

**Headers**: `Authorization: Bearer <admin_token>`

**Path params**:
- `id` - ID жалобы

**Response**: `204 No Content`

**Errors**:
- `401` - Не авторизован
- `403` - Недостаточно прав (не администратор)
- `404` - Жалоба не найдена

**Note**: Физическое удаление жалобы из БД. Используется редко, обычно жалобы переводятся в статус "rejected".

---

## Статусы жалоб

| Статус | Описание |
|--------|----------|
| pending | Ожидает рассмотрения администратором |
| in_progress | Жалоба принята в работу |
| resolved | Проблема решена |
| rejected | Жалоба отклонена (дубликат, не является проблемой и т.д.) |

---

## База данных

### Таблица complaints

```sql
CREATE TABLE complaints (
  id SERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  deviceDescription VARCHAR(255) NOT NULL,
  author INT4 NOT NULL REFERENCES users(id)
);

CREATE INDEX complaints_id ON complaints(id);
CREATE INDEX complaints_author ON complaints(author);
```

### Дополнительная таблица для истории (опционально)

```sql
CREATE TABLE complaint_status_history (
  id SERIAL PRIMARY KEY,
  complaint_id INT4 NOT NULL REFERENCES complaints(id),
  status VARCHAR(20) NOT NULL,
  comment VARCHAR(500),
  changed_by INT4 REFERENCES administrators(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Конфигурация

### Environment Variables

```bash
PORT=8086
DB_HOST=postgres
DB_PORT=5432
DB_NAME=messenger_db
DB_USER=user
DB_PASSWORD=password

AUTH_SERVICE_URL=http://localhost:8081
USER_SERVICE_URL=http://localhost:8082

# Email notifications (optional)
EMAIL_ENABLED=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password
ADMIN_EMAIL=admin@example.com
```

---

## Уведомления (опционально)

### Email уведомления администратору

При создании новой жалобы можно отправлять email администратору:

```
Subject: New complaint #1
From: noreply@example.com
To: admin@example.com

New complaint has been submitted:

ID: 1
Author: Ivan Ivanov (ivan@example.com)
Date: 2024-01-01
Status: pending

Text: Application crashes when uploading large files

Device: Windows 10, Chrome 120.0, 16GB RAM

View complaint: http://admin.example.com/complaints/1
```

### Email уведомление пользователю

При изменении статуса жалобы отправлять уведомление автору:

```
Subject: Your complaint #1 status update
From: noreply@example.com
To: ivan@example.com

Status of your complaint has been changed:

Status: resolved
Comment: Issue fixed in version 1.2.3

Thank you for your feedback!
```

---

## Примечания

1. Жалобы помогают администраторам отслеживать проблемы приложения
2. device_description должно включать: ОС, браузер, версию, RAM и другую полезную информацию
3. Пользователи видят только свои жалобы
4. Администраторы имеют полный доступ ко всем жалобам
5. История изменений статуса помогает отслеживать работу с жалобой
6. Можно интегрировать с системой тикетов (Jira, GitHub Issues)
7. Email уведомления опциональны, но рекомендуются

---

## Интеграции (будущее развитие)

1. **Jira Integration**: Автоматическое создание тикетов в Jira
2. **Slack/Telegram**: Уведомления в мессенджеры
3. **Аналитика**: Статистика по типам проблем
4. **Приоритеты**: Добавить систему приоритетов жалоб
5. **Вложения**: Возможность прикреплять скриншоты и логи

---

[← Назад к списку сервисов](./README.md)

---

**Последнее обновление**: 2024-12-04








