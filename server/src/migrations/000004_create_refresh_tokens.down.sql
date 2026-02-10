-- Rollback refresh_tokens table

ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS fk_refresh_tokens_user;

DROP TABLE IF EXISTS refresh_tokens;
