UPDATE users SET is_deleted = false
WHERE is_deleted = NULL;

ALTER TABLE users DROP COLUMN deleted_at;

ALTER TABLE users ALTER COLUMN is_deleted SET NOT NULL;

ALTER TABLE users
  ADD COLUMN phone TEXT,
  ADD COLUMN status TEXT NOT NULL,
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN updated_at TIMESTAMPTZ;

ALTER TABLE users
  ADD CONSTRAINT users_valid_status
  CHECK (status in ('active', 'suspended', 'pending_verification'));