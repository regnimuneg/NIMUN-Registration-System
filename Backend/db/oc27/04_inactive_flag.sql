-- OC'27: members can be marked inactive (kept in the database, hidden everywhere,
-- refused by the scanner). UNI-03 was left out on request.
ALTER TABLE members ADD COLUMN IF NOT EXISTS inactive BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE members SET inactive = TRUE WHERE id = 'UNI-03';
