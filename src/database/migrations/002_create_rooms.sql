CREATE TABLE rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  price_per_night NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT room_price_positive CHECK (price_per_night > 0)
);