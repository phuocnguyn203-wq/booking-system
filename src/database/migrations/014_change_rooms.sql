ALTER TABLE rooms ADD COLUMN type_id INTEGER REFERENCES room_types(id);
ALTER TABLE rooms DROP COLUMN price_per_night;