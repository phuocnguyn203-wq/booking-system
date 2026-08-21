ALTER TABLE bookings RENAME COLUMN deleted_at TO is_deleted;

ALTER TABLE bookings
ALTER COLUMN is_deleted TYPE BOOLEAN USING (is_deleted IS NOT NULL),
ALTER COLUMN is_deleted SET DEFAULT false;