import { query } from '../../database/index.js'

import { createDataAccessError } from '../errors/DataAccessError.js'

function mapRowToUser(userRow) {
  return {
    id: userRow.id,
    fullname: userRow.fullname,
    email: userRow.email
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
}