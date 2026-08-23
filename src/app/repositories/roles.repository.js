import createAppError from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'

function mapRowToRole(row) {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.is_active
  }
}

export default class RoleRepository {
  constructor(query) {
    this.query = query
  }

  async findById(id) {
    try {
      const rowResult = await this.query(
        `
        SELECT id, code, name, description, is_active
        FROM roles
        WHERE id=$1;
        `,
        [id]
      )
      
      if (rowResult.rows.length === 0)
        return null
      return mapRowToRole(rowResult.rows[0])
    } catch (error) {
      console.log(error)
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }

}