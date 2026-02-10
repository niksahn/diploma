-- Rollback complaint status and history (do not drop complaints - from initial schema)

DROP TABLE IF EXISTS complaint_status_history;

DROP INDEX IF EXISTS complaints_status_idx;

ALTER TABLE complaints
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;


