-- Миграция: Изменение типа полей name и description в таблице tariffs
-- с INT4 на VARCHAR
-- 
-- ВНИМАНИЕ: Эта миграция удалит все данные из таблицы tariffs!
-- Если в таблице есть важные данные, сделайте резервную копию перед применением.

DO $$
BEGIN
  -- Проверяем, есть ли данные в таблице
  IF EXISTS (SELECT 1 FROM tariffs LIMIT 1) THEN
    RAISE NOTICE 'ВНИМАНИЕ: В таблице tariffs есть данные. Они будут удалены!';
    RAISE NOTICE 'Если данные важны, сделайте резервную копию перед продолжением.';
  END IF;
END $$;

-- Сначала удаляем UNIQUE индексы, так как они могут мешать изменению типа
DROP INDEX IF EXISTS tariffs_name;
DROP INDEX IF EXISTS tariffs_description;

-- Удаляем данные из таблицы, так как INT4 значения не могут быть преобразованы в VARCHAR
-- Если в таблице есть важные данные, их нужно будет восстановить вручную
DELETE FROM tariffs;

-- Изменяем тип полей
ALTER TABLE tariffs 
  ALTER COLUMN name TYPE VARCHAR(100) USING name::text,
  ALTER COLUMN description TYPE VARCHAR(500) USING description::text;

-- Восстанавливаем UNIQUE индексы
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_name ON tariffs (name);
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_description ON tariffs (description);

