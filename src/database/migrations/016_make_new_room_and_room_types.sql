-- Thay đổi room_types
ALTER TABLE room_types
  ADD COLUMN code TEXT NOT NULL UNIQUE,
  ADD COLUMN description TEXT,
  ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE room_types
  RENAME COLUMN max_guest TO capacity;

ALTER TABLE room_types
  ALTER COLUMN price_per_night TYPE NUMERIC(12, 2);

ALTER TABLE room_types
  RENAME CONSTRAINT check_max_guest TO check_capacity;


-- Thay đổi rooms
ALTER TABLE rooms
  DROP CONSTRAINT rooms_type_id_fkey;

ALTER TABLE rooms
  RENAME COLUMN type_id TO room_type_id;

ALTER TABLE rooms
  ALTER COLUMN room_type_id TYPE BIGINT
    USING room_type_id::BIGINT;

ALTER TABLE rooms
  ALTER COLUMN room_type_id SET NOT NULL;

ALTER TABLE rooms
  ADD COLUMN room_number TEXT NOT NULL UNIQUE,
  ADD COLUMN floor INTEGER,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE rooms
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN is_deleted SET NOT NULL;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_room_type_fk
    FOREIGN KEY (room_type_id)
    REFERENCES room_types(id);

ALTER TABLE rooms
  ADD CONSTRAINT rooms_valid_status
    CHECK (status IN ('active', 'maintenance', 'out_of_service'));