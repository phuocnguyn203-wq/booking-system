import RepositoryError from '../errors/RepositoryError.js'

export function mapRowToBooking(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    roomId: Number(row.room_id),
    checkInDate: row.check_in,
    checkOutDate: row.check_out,
    status: row.status
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

  if (error.code === '23P01') {
    return new RepositoryError('EXCLUSION_CONSTRAINT', {
      constraint: error.constraint,
      cause: error
    })
  }

  return new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
}

export default class BookingRepository {
  constructor(query) {
    this.query = query
  }

  async findById(id) {
    try {
      const rowResult = await this.query(
        `
        SELECT id, user_id, room_id, check_in, check_out, status
        FROM bookings
        WHERE id=$1 AND is_deleted=false;
        `,
        [id]
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToBooking(rowResult.rows[0])
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }

  async createBooking(bookingInfo) {
    const {
      userId,
      roomId,
      checkInDate,
      checkOutDate,
      status = 'pending'
    } = bookingInfo ?? {}

    try {
      const rowResult = await this.query(
        `
        INSERT INTO bookings (user_id, room_id, check_in, check_out, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
        `,
        [userId, roomId, checkInDate, checkOutDate, status]
      )

      return mapRowToBooking(rowResult.rows[0])
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }

  async updateBooking(id, updateInfo) {
    const interfaceMap = new Map([
      ['checkInDate', 'check_in'],
      ['check_in', 'check_in'],
      ['checkOutDate', 'check_out'],
      ['check_out', 'check_out'],
      ['status', 'status']
    ])

    const mappedFields = new Map()
    for (const [key, value] of Object.entries(updateInfo ?? {})) {
      if (interfaceMap.has(key) && value !== undefined)
        mappedFields.set(interfaceMap.get(key), value)
    }

    const entries = Array.from(mappedFields.entries())
    if (entries.length === 0)
      throw new RepositoryError('NO_UPDATABLE_FIELDS')

    const values = []
    const setClause = entries.map(([column, value]) => {
      values.push(value)
      return `${column}=$${values.length}`
    })
    values.push(id)

    try {
      const rowResult = await this.query(
        `
        UPDATE bookings
        SET ${setClause.join(', ')}
        WHERE id=$${values.length} AND is_deleted=false
        RETURNING *;
        `,
        values
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToBooking(rowResult.rows[0])
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }

  async deleteById(id) {
    try {
      const rowResult = await this.query(
        `
        UPDATE bookings
        SET is_deleted=true
        WHERE id=$1 AND is_deleted=false;
        `,
        [id]
      )

      return rowResult.rowCount > 0
    } catch (error) {
      throw mapDatabaseError(error)
    }
  }
}
