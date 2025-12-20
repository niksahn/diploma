-- Add author_email field to complaints table

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS author_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS complaints_author_email_idx ON complaints(author_email);







