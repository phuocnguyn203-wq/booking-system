import { Errors } from '../errors/errorDefinitions.js';
import { createAppError } from '../errors/AppError.js';

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
      // TODO: It must throw DataAccessError here because it's unknown
      throw error
    }
  }
}
