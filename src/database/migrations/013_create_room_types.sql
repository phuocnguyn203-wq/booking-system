CREATE TABLE room_types (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_per_night numeric(10, 2) NOT NULL,
  max_guest INTEGER NOT NULL

  CONSTRAINT check_price_per_night CHECK (price_per_night > 0),
  CONSTRAINT check_max_guest CHECK (max_guest > 0) 
)