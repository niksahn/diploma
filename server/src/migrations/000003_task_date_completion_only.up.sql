-- Поле date: дата завершения (календарная), только для завершённых задач; не дедлайн при создании.
ALTER TABLE tasks ALTER COLUMN date DROP NOT NULL;

UPDATE tasks SET date = NULL WHERE status <> 4;

UPDATE tasks
SET date = (completed_at AT TIME ZONE 'UTC')::date
WHERE status = 4 AND completed_at IS NOT NULL;
