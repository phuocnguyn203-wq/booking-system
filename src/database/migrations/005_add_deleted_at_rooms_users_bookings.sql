ALTER TABLE users ADD COLUMN deleted_at timestamptz DEFAULT NOW();
ALTER TABLE rooms ADD COLUMN deleted_at timestamptz DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN deleted_at timestamptz DEFAULT NOW();