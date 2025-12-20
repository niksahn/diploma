-- Remove author_email field from complaints table

DROP INDEX IF EXISTS complaints_author_email_idx;

ALTER TABLE complaints DROP COLUMN IF EXISTS author_email;







