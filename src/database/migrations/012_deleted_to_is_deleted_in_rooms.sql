ALTER TABLE rooms RENAME COLUMN deleted_at TO is_deleted;
ALTER TABLE rooms ALTER COLUMN is_deleted TYPE BOOLEAN USING (is_deleted IS NOT NULL);
ALTER TABLE rooms ALTER COLUMN is_deleted SET DEFAULT false