# Быстрое применение миграции для таблицы tariffs

## Вариант 1: Прямое выполнение SQL (рекомендуется)

Скопируйте и выполните SQL команды в вашем SQL клиенте (DBeaver, pgAdmin, psql и т.д.):

```sql
-- Удаляем UNIQUE индексы
DROP INDEX IF EXISTS tariffs_name;
DROP INDEX IF EXISTS tariffs_description;

-- Удаляем данные из таблицы (так как INT4 значения не могут быть преобразованы в VARCHAR)
DELETE FROM tariffs;

-- Изменяем тип полей
ALTER TABLE tariffs 
  ALTER COLUMN name TYPE VARCHAR(100) USING name::text,
  ALTER COLUMN description TYPE VARCHAR(500) USING description::text;

-- Восстанавливаем UNIQUE индексы
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_name ON tariffs (name);
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_description ON tariffs (description);
```

## Вариант 2: Использование файла миграции

Если вы используете psql из командной строки:

```bash
psql -U user -d messenger_db -f server/src/migrations/apply_tariffs_migration.sql
```

Или в psql:

```sql
\i server/src/migrations/apply_tariffs_migration.sql
```

## Вариант 3: Через Docker (если БД в контейнере)

```bash
docker exec -i messenger_postgres psql -U user -d messenger_db < server/src/migrations/apply_tariffs_migration.sql
```

## Проверка результата

После применения миграции проверьте результат:

```sql
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'tariffs' 
  AND column_name IN ('name', 'description');
```

Ожидаемый результат:
- `name`: `character varying`, `100`
- `description`: `character varying`, `500`

## Важно!

⚠️ **Эта миграция удалит все данные из таблицы `tariffs`!**

Если в таблице есть важные данные:
1. Сделайте резервную копию: `pg_dump -U user -d messenger_db -t tariffs > tariffs_backup.sql`
2. Примените миграцию
3. Восстановите данные вручную (если необходимо)











