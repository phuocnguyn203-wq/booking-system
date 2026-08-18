import { Errors } from '../errors/errorDefinitions.js';
import { createAppError } from '../errors/AppError.js';
import { createDataAccessError } from '../errors/DataAccessError.js';

function mapRowToRoom(row) {
  return {
    id: row.id,
    name: row.name,
    pricePerNight: Number(row.price_per_night),
    created_at: row.created_at,
  };
}
export class RoomRepository {
  constructor(query) {
    this.query = query;
  }

  async findById(id) {
    try {
      const result = await this.query(
        `
        SELECT id, name, price_per_night, created_at
        FROM rooms
        WHERE id=$1
        `,
        [id]
      )
      if (result.rows.length === 0)
        return null

      return mapRowToRoom(result.rows[0])
    } catch (error) {
      throw createDataAccessError(Errors.DATA_ACCESS_ERROR)
    }
    
  }

  async createRoom({name, pricePerNight}) {
    try { 
      const result = await this.query(
        `
        INSERT INTO rooms (name, price_per_night)
        VALUES
        ($1, $2)
        RETURNING *
        `,
        [name, pricePerNight]
      )

      return mapRowToRoom(result.rows[0])
    } catch (error) {
      if (error.code === '23505')
        throw createAppError(Errors.ROOM_ALREADY_EXISTS)
      throw createDataAccessError(Errors.DATA_ACCESS_ERROR)
    }
  }

  async deleteById(id) {
    try {
      const result = await this.query(
        `
        UPDATE rooms SET deleted_at=NOW()
        WHERE id=$1 AND deleted_at IS NULL
        `,
        [id]
      )
      return result.rowCount === 1
    } catch (error) {
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }
}
