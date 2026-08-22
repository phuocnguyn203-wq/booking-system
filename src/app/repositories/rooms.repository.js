import Errors from '../errors/errorDefinitions.js';
import createAppError from '../errors/AppError.js';

function mapRowToRoom(row) {
  return {
    id: Number(row.id),
    roomNumber: row.room_number,
    roomTypeId: Number(row.room_type_id),
    floor: Number(row.floor) || null,
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

  async createRoom(roomInfo) {
    try { 
      const {
        roomNumber,
        roomTypeId,
        floor,
        status
      } = roomInfo

      const result = await this.query(
        `
        INSERT INTO rooms (room_number, room_type_id, floor, status)
        VALUES
        ($1, $2, $3, $4)
        RETURNING *
        `,
        [roomNumber, roomTypeId, floor, status]
      )

      return mapRowToRoom(result.rows[0])
    } catch (error) {
      if (error.code === '23502')
        throw createAppError(Errors.NOT_NULL_VALIDATION)
      if (error.code === '23503') // Foreign key violation, roomTypeId does not exist
        throw createAppError(Errors.ROOM_TYPE_DOES_NOT_EXIST)
      if (error.code === '23514') // Check violation, not valid status
        throw createAppError(Errors.INVALID_STATUS_ROOM)
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
    try {
      const allowedFields = new Set([
        'room_number',
        'room_type_id',
        'floor',
        'status'
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
    } catch (error) {
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }
    
}
