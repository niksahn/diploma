-- Быстрое применение миграции для таблицы tariffs
-- Этот файл можно выполнить напрямую в psql или через любой SQL клиент
--
-- ВНИМАНИЕ: Эта миграция удалит все данные из таблицы tariffs!
-- Если у вас есть важные данные, сделайте резервную копию перед выполнением.
--
-- Для применения просто скопируйте и выполните команды ниже в вашем SQL клиенте

BEGIN;

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

COMMIT;

-- Проверяем результат
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'tariffs' 
  AND column_name IN ('name', 'description');

