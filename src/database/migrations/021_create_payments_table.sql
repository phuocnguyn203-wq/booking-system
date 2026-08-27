CREATE TABLE payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  booking_id BIGINT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',

  method TEXT NOT NULL,
  provider TEXT,
  provider_transaction_id TEXT,
  idempotency_key TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',

  failure_code TEXT,
  failure_message TEXT,

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payments_booking_fk
    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE RESTRICT,

  CONSTRAINT payments_positive_amount
    CHECK (amount > 0),

  CONSTRAINT payments_valid_method
    CHECK (
      method IN (
        'cash',
        'card',
        'bank_transfer',
        'e_wallet'
      )
    ),

  CONSTRAINT payments_valid_status
    CHECK (
      status IN (
        'pending',
        'processing',
        'succeeded',
        'failed',
        'cancelled'
      )
    ),

  CONSTRAINT payments_idempotency_key_unique
    UNIQUE (idempotency_key),

  CONSTRAINT payments_provider_transaction_unique
    UNIQUE (provider, provider_transaction_id)
);