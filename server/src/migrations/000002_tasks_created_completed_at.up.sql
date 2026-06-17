-- Разделение срока задачи (date) и меток времени: создание и фактическое завершение.
ALTER TABLE tasks
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN completed_at TIMESTAMPTZ NULL;
