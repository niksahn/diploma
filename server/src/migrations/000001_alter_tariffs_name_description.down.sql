-- Откат миграции: Возврат типа полей name и description в таблице tariffs
-- с VARCHAR на INT4

-- Удаляем UNIQUE индексы
DROP INDEX IF EXISTS tariffs_name;
DROP INDEX IF EXISTS tariffs_description;

-- Удаляем данные из таблицы, так как строковые значения не могут быть преобразованы в INT4
DELETE FROM tariffs;

-- Изменяем тип полей обратно на INT4
ALTER TABLE tariffs 
  ALTER COLUMN name TYPE INT4 USING NULL,
  ALTER COLUMN description TYPE INT4 USING NULL;

-- Восстанавливаем UNIQUE индексы
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_name ON tariffs (name);
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_description ON tariffs (description);














