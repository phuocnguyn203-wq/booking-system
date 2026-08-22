import Errors from '../errors/errorDefinitions.js';
import createAppError from '../errors/AppError.js';

function mapRowToRoom(row) {
  return {
    id: Number(row.id),
    roomNumber: row.room_number,
    roomTypeId: Number(row.room_type_id),
    floor: row.floor,
    status: row.status,
    isDeleted: row.is_deleted,
  };
}
export default class RoomRepository {
  constructor(query) {
    this.query = query;
  }

  async findById(id) {
    try {
      const result = await this.query(
        `
        SELECT id, room_number, room_type_id, floor, status, is_deleted 
        FROM rooms
        WHERE id=$1 AND is_deleted=false
        `,
        [id]
      )
      if (result.rows.length === 0)
        return null

      return mapRowToRoom(result.rows[0])
    } catch (error) {
      throw createAppError(Errors.DATA_ACCESS_ERROR)
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
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }

  async deleteById(id) {
    try {
      const result = await this.query(
        `
        UPDATE rooms SET is_deleted=true
        WHERE id=$1 AND is_deleted IS false
        `,
        [id]
      )
      return result.rowCount > 0
    } catch (error) {
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }

  async updateRoom(id, updateInfo) {
    const allowedFields = new Set([
      'name',
      'price_per_night'
    ])

    const entries = Object.entries(updateInfo).filter(
      ([key, value]) => allowedFields.has(key) && value !== undefined
    )

    if (entries.length === 0)
      throw createAppError(Errors.NO_VALID_FIELDS)
    
    const values = []
    const setClause = entries.map(
      ([key, value]) => {
        values.push(value)
        return `"${key}" = $${values.length}`
      }
    )

    values.push(id)

    const query = `
      UPDATE rooms
      SET ${setClause.join(', ')}
      WHERE id = $${values.length} AND is_deleted=false
      RETURNING *;
    `
    const result = await this.query(query, values)
    
    if (result.rows.length === 0)
      return null
    return mapRowToRoom(result.rows[0])
  }
}
