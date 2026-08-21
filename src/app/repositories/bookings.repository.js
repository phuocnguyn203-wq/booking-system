import Errors from '../errors/errorDefinitions.js';
import createAppError from '../errors/AppError.js';

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
export default class BookingRepository {
  constructor(query) {
    this.query = query
  }

  async getById(id) {
    try {
      const rowResult = await this.query(
        `
        SELECT id, user_id, room_id, check_in, check_out, status
        FROM bookings WHERE id=$1
        `,
        [id]
      )

      if (rowResult.rows.length===0)
        return null
      return mapRowToBooking(rowResult.rows[0])
    } catch (error) {
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }

  async createBooking({ userId, roomId, checkInDate, checkOutDate, status }) {
    try {
      const rowResult = await this.query(
        `
        INSERT INTO bookings (user_id, room_id, check_in, check_out, status)
        VALUES
        ($1, $2, $3, $4, $5)
        RETURNING *;
        `,
        [userId, roomId, checkInDate, checkOutDate, status]
      )

      return mapRowToBooking(rowResult.rows[0])
    } catch (error) {
      // CHECK VALIDATION CONSTRAINT
      if (error.code==='23514') {
        if (error.constraint === 'bookings_valid_date')
          throw createAppError(Errors.INVALID_DATE)
        if (error.constraint === 'bookings_valid_state')
          throw createAppError(Errors.INVALID_STATE)
      }
      // FOREIGN KEY CONSTRAINT
      if (error.code==='23503') {
        if (error.constraint === 'bookings_room_fk')
          throw createAppError(Errors.ROOM_NON_EXISTENT)
        if (error.constraint === 'bookings_user_fk')
          throw createAppError(Errors.USER_NON_EXISTENT)
      }

      // DATABASE ERROR
      console.log(error)
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }

  }
  
  async deleteById(id) {
    try {
      const rowResult = await this.query(
        `
        UPDATE bookings SET is_deleted=true 
        WHERE id=$1 AND (is_deleted IS NULL OR is_deleted IS false) 
        `,
        [id]
      )
      return rowResult.rowCount > 0
    } catch (error) {
      console.log(error)
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }

  async updateBooking(id, updateInfo) {
    const allowedFields = new Set([
      'check_in', 'check_out', 'status'
    ])

    const entries = Object.entries(updateInfo).filter(
      ([key, value]) => allowedFields.has(key) && value !== undefined
    )

    if (entries.length===0)
      throw createAppError(Errors.NO_VALID_FIELDS)

    const values = []
    const setClause = entries.map(([key, value]) => {
      values.push(value)
      return `${key}=$${values.length}`
    })
    values.push(id)

    const rowResult = await this.query(
      `
      UPDATE bookings SET ${setClause.join(', ')}
      WHERE id=$${values.length} AND is_deleted=false
      RETURNING *;
      `,
      values
    )

    if (rowResult.rows.length === 0)
      return null
    return rowResult.rows[0]
  }
}