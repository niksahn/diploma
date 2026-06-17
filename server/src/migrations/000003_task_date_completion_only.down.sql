-- Восстановление NOT NULL: сначала заполняем NULL произвольной датой (данные могут потерять смысл «только завершение»).
UPDATE tasks SET date = (created_at AT TIME ZONE 'UTC')::date WHERE date IS NULL;

ALTER TABLE tasks ALTER COLUMN date SET NOT NULL;
