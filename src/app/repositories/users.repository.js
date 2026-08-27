import RepositoryError from '../errors/RepositoryError.js'

function mapRowToUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    fullname: row.fullname,
    username: row.username,
    phone: row.phone,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    isDeleted: row.is_deleted
  }
}

function mapRowToCredentials(row) {
  return {
    id: Number(row.id),
    hashedPassword: row.hashed_password
  }
}

export default class UserRepository {
  constructor(query) {
    this.query = query
  }

  async findById(id) {
    try {
      const rowResult = await this.query(
        `
        SELECT * FROM users
        WHERE id=$1 AND is_deleted=false
        `,
        [id]
      )

      if (rowResult.rows.length === 0)
        return null
      return mapRowToUser(rowResult.rows[0])

    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async findByUsername(username) {
    try {
      const rowResult = await this.query(
        `
        SELECT
          id,
          email,
          fullname,
          username,
          phone,
          status,
          email_verified_at,
          is_deleted
        FROM users
        WHERE username=$1 AND is_deleted=false;
        `,
        [username]
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToUser(rowResult.rows[0])
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async findByEmail(email) {
    try {
      const rowResult = await this.query(
        `
        SELECT
          id,
          email,
          fullname,
          username,
          phone,
          status,
          email_verified_at,
          is_deleted
        FROM users
        WHERE email=$1 AND is_deleted=false;
        `,
        [email]
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToUser(rowResult.rows[0])
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async findCredentialsById(id) {
    try {
      const rowResult = await this.query(
        `
        SELECT id, hashed_password
        FROM users
        WHERE id=$1 AND is_deleted=false;
        `,
        [id]
      )

      if (rowResult.rows.length === 0)
        return null

      return mapRowToCredentials(rowResult.rows[0])
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async findCredentialsByUsername(username) {
    try {
      const rowResult = await this.query(
        `
        SELECT id, username, hashed_password, status
        FROM users
        WHERE username=$1 AND is_deleted=false;
        `,
        [username]
      )

      if (rowResult.rows.length === 0)
        return null

      const row = rowResult.rows[0]
      return {
        ...mapRowToCredentials(row),
        username: row.username,
        status: row.status
      }
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async createUser(userInfo) {
    try {
      const {
        email,
        fullname,
        username,
        hashedPassword,
        phone,
        status
      } = userInfo ?? {}

      const rowResult = await this.query(
      `
        INSERT INTO users (email, fullname, username, hashed_password, phone, status)
        VALUES
        ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [email, fullname, username, hashedPassword, phone, status]
      )
      return mapRowToUser(rowResult.rows[0])

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

      if (error.code === '23514') {
        throw new RepositoryError('CHECK_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async updateUser(id, updateInfo) {
    const interfaceMap = new Map([
      ['fullName', 'fullname'],
      ['fullname', 'fullname'],
      ['email', 'email'],
      ['phone', 'phone'],
      ['status', 'status'],
      ['emailVerifiedAt', 'email_verified_at'],
      ['hashedPassword', 'hashed_password']
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
      const rowResult = await this.query(
        `
        UPDATE users SET ${setClause.join(', ')}
        WHERE id=$${values.length} AND is_deleted=false
        RETURNING *
        `,
        values
      )
    
      if (rowResult.rows.length === 0)
        return null
      return mapRowToUser(rowResult.rows[0])  
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

      if (error.code === '23514') {
        throw new RepositoryError('CHECK_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async deleteUser(id) {
    try {
      const rowResult = await this.query(
        `
        UPDATE users
        SET is_deleted=true
        WHERE id=$1 AND is_deleted=false;
        `,
        [id]
      )
      
      return rowResult.rowCount > 0
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }
}
