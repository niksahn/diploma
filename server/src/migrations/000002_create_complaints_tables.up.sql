-- Add status, timestamps to complaints and create complaint_status_history
-- (complaints table already exists from 000000_initial_schema)

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status);

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id SERIAL PRIMARY KEY,
  complaint_id INT4 NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  comment VARCHAR(500),
  changed_by INT4,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS complaint_status_history_complaint_idx ON complaint_status_history(complaint_id);
CREATE INDEX IF NOT EXISTS complaint_status_history_status_idx ON complaint_status_history(status);


