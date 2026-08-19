import { query } from '../../database/index.js'
import { createAppError } from '../errors/AppError.js'
import { createDataAccessError } from '../errors/DataAccessError.js'
import { Errors } from '../errors/errorDefinitions.js'

import { createDataAccessError } from '../errors/DataAccessError.js'

function mapRowToUser(userRow) {
  return {
    id: Number(userRow.id),
    fullname: userRow.fullname,
    email: userRow.email,
    username: userRow.username,
    hashedPassword: userRow.hashed_password
  }
}

export class UserRepository {
  constructor(query) {
    this.query = query
  }

  async findById(id) {
    try {
      const rowResult = await this.query(
        `
        SELECT id, fullname, email FROM users
        WHERE id=$1
        `,
        [id]
      )

      if (rowResult.rows.length === 0)
        return null
      return mapRowToUser(rowResult.rows[0])

    } catch (error) {
      throw createDataAccessError(error)
    }
  }

  async createUser({ email, fullname, username, hashedPassword }) {
    try {
      const rowResult = await this.query(
      `
        INSERT INTO users (email, fullname, username, hashed_password)
        VALUES
        ($1, $2, $3, $4)
        RETURNING *
      `,
      [email, fullname, username, hashedPassword]
      )

      return mapRowToUser(rowResult.rows[0])

    } catch (error) {
      switch (error.code){
        case '23502': throw createAppError(Errors.NOT_NULL_VALIDATION); break;
        case '23505': throw createAppError(Errors.UNIQUE_VALIDATION); break;
        case '23514': throw createAppError(Errors.EMAIL_VALIDATION); break;
      }

      throw createDataAccessError(Errors.DATA_ACCESS_ERROR)
      console.log(error)
    }
  }

  async updateUser(id, updateInfo) {
    const allowedFields = new Set(['email', 'fullname'])
    
    const entries = Object.entries(updateInfo).filter(
      ([key, value]) => allowedFields.has(key) && value !== undefined
    )
    if (entries.length === 0)
      throw createAppError(Errors.NO_VALID_FIELDS)

    const setClause = []
    const values = entries.map(([key, value]) => {
      setClause.push(`${key}=$${setClause.length+1}`)
      return value
    })
    values.push(id)

    const rowResult = await query(
    `
    UPDATE users SET ${setClause.join(', ')}
    WHERE id=$${values.length}
    RETURNING *
    `,
    values
    )
    
    if (rowResult.rows.length === 0)
      return null
    return mapRowToUser(rowResult.rows[0])    
  }
}