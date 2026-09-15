import RepositoryError from '../errors/RepositoryError.js'

export function mapRowToPayment(row) {
  return {
    id: Number(row.id),
    bookingId: Number(row.booking_id),
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    provider: row.provider,
    providerTransactionId: row.provider_transaction_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapDatabaseError(error) {
  if (error instanceof RepositoryError)
    return error

  if (error.code === '23505') {
    return new RepositoryError('UNIQUE_CONSTRAINT', {
      constraint: error.constraint,
      cause: error
    })
  }

  if (error.code === '23502') {
    return new RepositoryError('NOT_NULL_CONSTRAINT', {
      column: error.column,
      cause: error
    })
  }

  if (error.code === '23503') {
    return new RepositoryError('FOREIGN_KEY_CONSTRAINT', {
      constraint: error.constraint,
      cause: error
    })
  }

  if (error.code === '23514') {
    return new RepositoryError('CHECK_CONSTRAINT', {
      constraint: error.constraint,
      cause: error
    })
  }

  return new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
}

export default class PaymentRepository {
  constructor(query) {
    this.query = query
  }

  async findById(id) {
    try {
      const rowResult = await this.query(
        `
        SELECT
          id,
          booking_id,
          amount,
          currency,
          method,
          provider,
          provider_transaction_id,
          idempotency_key,
          status,
          failure_code,
          failure_message,
          paid_at,
          created_at,
          updated_at
        FROM payments
        WHERE id=$1;
        `,
        [id]
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToPayment(rowResult.rows[0])
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }

  async findByUserId(userId, { limit, offset }) {
    try {
      const rowResult = await this.query(
        `
        SELECT p.*, COUNT(*) OVER() AS total_count
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE b.user_id=$1 AND b.is_deleted=false
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $2 OFFSET $3;
        `,
        [userId, limit, offset]
      )

      let total = rowResult.rows.length === 0
        ? null
        : Number(rowResult.rows[0].total_count)

      if (total === null) {
        const countResult = await this.query(
          `
          SELECT COUNT(*) AS total_count
          FROM payments p
          JOIN bookings b ON b.id = p.booking_id
          WHERE b.user_id=$1 AND b.is_deleted=false;
          `,
          [userId]
        )
        total = Number(countResult.rows[0].total_count)
      }

      return {
        total,
        items: rowResult.rows.map(mapRowToPayment)
      }
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }

  async findByIdForUser(id, userId) {
    try {
      const rowResult = await this.query(
        `
        SELECT p.*
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE p.id=$1 AND b.user_id=$2 AND b.is_deleted=false;
        `,
        [id, userId]
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToPayment(rowResult.rows[0])
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }

  async createForUser(userId, paymentInfo) {
    const {
      bookingId,
      method,
      provider,
      providerTransactionId,
      idempotencyKey
    } = paymentInfo ?? {}

    try {
      const rowResult = await this.query(
        `
        INSERT INTO payments (
          booking_id,
          amount,
          currency,
          method,
          provider,
          provider_transaction_id,
          idempotency_key
        )
        SELECT
          b.id,
          rt.price_per_night * (b.check_out - b.check_in),
          'VND',
          $3,
          $4,
          $5,
          $6
        FROM bookings b
        JOIN rooms r ON r.id = b.room_id
        JOIN room_types rt ON rt.id = r.room_type_id
        WHERE b.id=$1
          AND b.user_id=$2
          AND b.is_deleted=false
          AND b.status IN ('pending', 'confirmed')
          AND r.is_deleted=false
          AND rt.is_deleted=false
        RETURNING *;
        `,
        [
          bookingId,
          userId,
          method,
          provider,
          providerTransactionId,
          idempotencyKey
        ]
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToPayment(rowResult.rows[0])
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }

  async createPayment(paymentInfo) {
    const {
      bookingId,
      amount,
      currency,
      method,
      provider,
      providerTransactionId,
      idempotencyKey,
      status,
      failureCode,
      failureMessage,
      paidAt
    } = paymentInfo ?? {}

    const fields = [
      { column: 'booking_id', value: bookingId, required: true },
      { column: 'amount', value: amount, required: true },
      { column: 'currency', value: currency },
      { column: 'method', value: method, required: true },
      { column: 'provider', value: provider },
      {
        column: 'provider_transaction_id',
        value: providerTransactionId
      },
      {
        column: 'idempotency_key',
        value: idempotencyKey,
        required: true
      },
      { column: 'status', value: status },
      { column: 'failure_code', value: failureCode },
      { column: 'failure_message', value: failureMessage },
      { column: 'paid_at', value: paidAt }
    ]

    const insertedFields = fields.filter(field => {
      return field.required || field.value !== undefined
    })
    const columns = insertedFields.map(field => field.column)
    const values = insertedFields.map(field => field.value)
    const placeholders = insertedFields.map((_, index) => `$${index + 1}`)

    try {
      const rowResult = await this.query(
        `
        INSERT INTO payments (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *;
        `,
        values
      )

      return mapRowToPayment(rowResult.rows[0])
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }
}
