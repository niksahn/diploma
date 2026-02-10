# Миграции базы данных

Каталог содержит SQL-миграции в формате **golang-migrate**. При подъёме стека Docker миграции применяются автоматически сервисом `migrate` перед запуском приложений.

## Структура

- Файлы `*.up.sql` — применение миграции
- Файлы `*.down.sql` — откат миграции
- Нумерация: `000000`, `000001`, … — порядок применения

## Список миграций

| Версия | Описание |
|--------|----------|
| **000000** | Начальная схема БД (таблицы users, administrators, tariffs, workspaces, chats, tasks, complaints, messages, userInWorkspace, userInChat, taskInChat, taskChanges, userInTask) |
| **000001** | Изменение полей `tariffs.name` и `tariffs.description` с INT4 на VARCHAR(100) и VARCHAR(500) |
| **000002** | Расширение `complaints`: колонки status, created_at, updated_at; таблица `complaint_status_history` |
| **000003** | Поле `complaints.author_email` |
| **000004** | Таблица `refresh_tokens` для JWT (Auth Service) |

## Применение миграций

### Через Docker (рекомендуется)

При `docker compose up` сервис `migrate` запускается после готовности PostgreSQL и выполняет `migrate up`. Остальные сервисы стартуют после успешного завершения миграций (`depends_on: migrate, condition: service_completed_successfully`).

Запуск только миграций (например, после добавления новых файлов):

```bash
cd server/src
docker compose run --rm migrate
```

### Локальный CLI (cmd/migrate)

Из корня репозитория (или из `server/src`):

```bash
cd server/src/cmd/migrate
go mod tidy   # при первом запуске
go run . -path ../../migrations up
```

Переменные окружения (или `.env`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. По умолчанию: `localhost:5432`, user/password, `messenger_db`.

Команды:

- `up` — применить все неприменённые миграции (по умолчанию)
- `down [N]` — откатить последние N миграций (по умолчанию 1)
- `force V` — пометить текущую версию как V (при «грязном» состоянии)
- `version` — показать текущую версию

Пример с указанием пути к миграциям:

```bash
go run . -path /absolute/path/to/server/src/migrations up
```

### Утилита golang-migrate

Установка:

```bash
# macOS
brew install golang-migrate

# или через Go
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

Применение (из каталога `server/src`):

```bash
migrate -path ./migrations -database "postgres://user:password@localhost:5432/messenger_db?sslmode=disable" up
```

Откат одной миграции:

```bash
migrate -path ./migrations -database "postgres://user:password@localhost:5432/messenger_db?sslmode=disable" down 1
```

## Как добавлять новые миграции

1. **Определи номер версии** — следующий по порядку: сейчас последняя `000004`, следующая будет `000005`, затем `000006` и т.д.

2. **Создай пару файлов** в каталоге `migrations/`:
   - `000005_краткое_описание.up.sql` — что сделать при применении
   - `000005_краткое_описание.down.sql` — как откатить (обратные действия)

   Имя после номера — только для читаемости, на порядок применения не влияет (важен только префикс `00000N`).

3. **Пример.** Добавляем колонку `avatar_url` в `users`:

   **000005_add_avatar_url_to_users.up.sql**
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
   ```

   **000005_add_avatar_url_to_users.down.sql**
   ```sql
   ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
   ```

4. **Через CLI golang-migrate** можно сгенерировать заготовки (пустые up/down):
   ```bash
   cd server/src
   migrate create -ext sql -dir ./migrations -seq add_avatar_url_to_users
   ```
   Появится пара `000005_add_avatar_url_to_users.up.sql` и `.down.sql` — останется заполнить их SQL.

5. **Обнови таблицу** «Список миграций» в этом README, добавив новую строку с номером и описанием.

6. **Проверь:** примени миграцию локально (`docker compose run --rm migrate` или `go run . -path ../../migrations up`), затем откат (`down 1`) и снова `up` — убедись, что down откатывает изменения без ошибок.

---

## Важно

- **000001** удаляет данные в `tariffs` при смене типов. Перед применением на проде сделайте бэкап.
- Миграции по возможности должны быть идемпотентными (используйте `IF NOT EXISTS` / `IF EXISTS` где уместно).
- Перед применением в продакшене проверяйте миграции на копии БД.
