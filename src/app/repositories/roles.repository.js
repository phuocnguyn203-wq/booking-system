import RepositoryError from '../errors/RepositoryError.js'

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
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async createRole(roleInfo) {
    const {
      code,
      name,
      description=null
    } = roleInfo ?? {}
    try {
      const rowResult = await this.query(
        `
        INSERT INTO roles (code, name, description)
        VALUES 
        ($1, $2, $3)
        RETURNING id, code, name, description, is_active
        `,
        [code, name, description]
      )

      return mapRowToRole(rowResult.rows[0])
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

      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async updateRole(id, updateInfo) {
    const interfaceMap = new Map([
      ['code', 'code'],
      ['name', 'name'],
      ['description', 'description'],
      ['isActive', 'is_active']
    ])

    const entries = Object.entries(updateInfo ?? {})
      .filter(([key, value]) => {
        return interfaceMap.has(key) && value !== undefined
      })
      .map(([key, value]) => {
        return [interfaceMap.get(key), value]
      })
    
    if (entries.length === 0)
      throw new RepositoryError('NO_UPDATABLE_FIELDS')

    const values = []
    const setClause = entries.map(([key, value]) => {
      values.push(value)
      return `${key} = $${values.length}`
    })
    values.push(id)

    try {
      const rowResult = await this.query(
        `
        UPDATE roles SET ${setClause.join(', ')}
        WHERE id=$${values.length}
        RETURNING id, code, name, description, is_active
        `
        ,values
      )

      if (rowResult.rows.length === 0)
        return null
      return mapRowToRole(rowResult.rows[0])
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

      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }

  }
  
}
