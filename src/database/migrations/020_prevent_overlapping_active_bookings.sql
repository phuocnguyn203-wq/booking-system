CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlapping_active_reservations
EXCLUDE USING gist (
  room_id WITH =,
  daterange(check_in, check_out, '[)') WITH &&
)
WHERE (
  status IN ('pending', 'confirmed')
  AND is_deleted = false
);
