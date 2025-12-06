-- Creates complaints and complaint_status_history tables

CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  devicedescription VARCHAR(255) NOT NULL,
  author INT4 NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS complaints_author_idx ON complaints(author);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status);

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id SERIAL PRIMARY KEY,
  complaint_id INT4 NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  comment VARCHAR(500),
  changed_by INT4 REFERENCES administrators(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS complaint_status_history_complaint_idx ON complaint_status_history(complaint_id);
CREATE INDEX IF NOT EXISTS complaint_status_history_status_idx ON complaint_status_history(status);


