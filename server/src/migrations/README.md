# Миграции базы данных

Этот каталог содержит SQL миграции для базы данных проекта.

## Структура

Миграции используют формат `golang-migrate`:
- Файлы с суффиксом `.up.sql` - применяют миграцию
- Файлы с суффиксом `.down.sql` - откатывают миграцию

## Применение миграций

### Используя golang-migrate CLI

1. Установите golang-migrate:
```bash
# Windows (с помощью Chocolatey)
choco install golang-migrate

# Linux/Mac
brew install golang-migrate
# или
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

2. Примените миграции:
```bash
migrate -path ./migrations -database "postgres://user:password@localhost:5432/messenger_db?sslmode=disable" up
```

3. Откатите миграции:
```bash
migrate -path ./migrations -database "postgres://user:password@localhost:5432/messenger_db?sslmode=disable" down
```

### Ручное применение

Вы можете применить миграцию вручную, выполнив SQL команды из файла `.up.sql`:

```bash
psql -U user -d messenger_db -f migrations/000001_alter_tariffs_name_description.up.sql
```

## Список миграций

### 000001_alter_tariffs_name_description
**Дата:** 2025-11-30  
**Описание:** Изменяет тип полей `name` и `description` в таблице `tariffs` с `INT4` на `VARCHAR(100)` и `VARCHAR(500)` соответственно.

**Важно:** Эта миграция удаляет все существующие данные из таблицы `tariffs`, так как невозможно преобразовать числовые значения в строковые. Если в таблице есть важные данные, их нужно будет восстановить вручную после применения миграции.

## Примечания

- Все миграции должны быть идемпотентными (можно безопасно применять несколько раз)
- Перед применением миграций в продакшене обязательно создайте резервную копию базы данных
- Проверяйте миграции на тестовой базе данных перед применением в продакшене










