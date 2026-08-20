import { Errors } from '../errors/errorDefinitions.js';
import { createAppError } from '../errors/AppError.js';
import { createDataAccessError } from '../errors/DataAccessError.js';

async function mapRowToBooking(row) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    room_id: Number(row.room_id),
    check_in: row.check_in,
    check_out: row.check_out
  }
}
export class BookingRepository {
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
      throw createDataAccessError(Errors.DATA_ACCESS_ERROR)
    }
  }
}