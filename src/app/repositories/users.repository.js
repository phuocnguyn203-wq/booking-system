import createAppError from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'

function mapRowToUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    fullname: row.fullname,
    username: row.username,
    phone: row.phone,
    status: row.status,
    emailVerifiedAt: row.status || null,
    isDeleted: row.isDeleted
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
      throw createAppError(error)
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
      } = userInfo

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
      switch (error.code){
        case '23502': throw createAppError(Errors.NOT_NULL_VALIDATION);
        case '23505': throw createAppError(Errors.UNIQUE_VALIDATION);
        case '23514': throw createAppError(Errors.EMAIL_VALIDATION);
      }

      console.log(error)
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  }

  async updateUser(id, updateInfo) {

    const interfaceMap = new Map([
      ['fullName', 'fullname'],
      ['email', 'email'],
      ['phone', 'phone'],
      ['status', 'status'],
      ['emailVerifiedAt', 'email_verified_at'],
      ['hashedPassword', 'hashed_password']
    ])

    for (const [key, value] of Object.entries(updateInfo)) {
      if (interfaceMap.has(key))
        updateInfo[interfaceMap.get(key)] = value
      else {
        delete updateInfo[key]
      }
    }

    console.log(updateInfo)

    const allowedFields = new Set([
      'email', 
      'fullname',
      'phone',
      'status',
      'email_verified_at',
      'hashed_password'
    ])
    
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
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }
  
  }

  async deleteUser(id) {
    try{
      const rowResult = await this.query(`UPDATE users SET is_deleted=true WHERE id=$1 AND is_deleted=false`, [id])
      
      return rowResult.rowCount > 0
    } catch (error) {
      console.log(error)
      throw createAppError(Errors.DATA_ACCESS_ERROR)
    }

  }
}
