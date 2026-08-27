import RepositoryError from '../errors/RepositoryError.js';

function mapRowToRoom(row) {
  return {
    id: Number(row.id),
    roomNumber: row.room_number,
    roomTypeId: Number(row.room_type_id),
    floor: row.floor === null ? null : Number(row.floor),
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
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
    
  }

  async createRoom(roomInfo) {
    try { 
      const {
        roomNumber,
        roomTypeId,
        floor,
        status
      } = roomInfo ?? {}

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
      if (error.code === '23505') {
        throw new RepositoryError('UNIQUE_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      if (error.code === '23502') {
        throw new RepositoryError('NOT_NULL_CONSTRAINT', {
          column: error.column,
          cause: error
        })
      }

      if (error.code === '23503') {
        throw new RepositoryError('FOREIGN_KEY_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      if (error.code === '23514') {
        throw new RepositoryError('CHECK_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
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
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async updateRoom(id, updateInfo) {
    const interfaceMap = new Map([
      ['roomNumber', 'room_number'],
      ['room_number', 'room_number'],
      ['roomTypeId', 'room_type_id'],
      ['room_type_id', 'room_type_id'],
      ['floor', 'floor'],
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
      if (error.code === '23505') {
        throw new RepositoryError('UNIQUE_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      if (error.code === '23502') {
        throw new RepositoryError('NOT_NULL_CONSTRAINT', {
          column: error.column,
          cause: error
        })
      }

      if (error.code === '23503') {
        throw new RepositoryError('FOREIGN_KEY_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      if (error.code === '23514') {
        throw new RepositoryError('CHECK_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }
    
}
