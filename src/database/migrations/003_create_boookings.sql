CREATE TABLE bookings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  room_id BIGINT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT bookings_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id),
  
  CONSTRAINT boookings_room_fk
    FOREIGN KEY (room_id)
    REFERENCES rooms(id),
  
  CONSTRAINT bookings_valid_date
    CHECK (check_out > check_in),
  
  CONSTRAINT bookings_valid_state
    CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);