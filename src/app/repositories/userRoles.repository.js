import RepositoryError from '../errors/RepositoryError.js'

export default class UserRoleRepository{
  constructor(query) {
    this.query = query
  }

  async findUserRoleByUserId(userId) {
    try {
      const rowResult = await this.query(
        `
        SELECT ur.role_id AS role_id FROM 
        user_roles ur JOIN users u
        ON ur.user_id=u.id
        JOIN roles r
        ON ur.role_id=r.id
        WHERE u.id=$1 AND u.is_deleted=false AND r.is_active=true;
        `,
        [userId]
      )

      const roleIds = rowResult.rows.map(row => Number(row.role_id))
      return roleIds
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async findActiveRoleCodesByUserId(userId) {
    try {
      const rowResult = await this.query(
        `
        SELECT r.code
        FROM user_roles ur
        JOIN users u ON ur.user_id=u.id
        JOIN roles r ON ur.role_id=r.id
        WHERE u.id=$1 AND u.is_deleted=false AND r.is_active=true
        ORDER BY r.code;
        `,
        [userId]
      )

      return rowResult.rows.map(row => row.code)
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }

  async addUserRole(userId, roleId) {
    try {
      const rowResult = await this.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        RETURNING role_id;
        `,
        [userId, roleId]
      )

      return Number(rowResult.rows[0].role_id)
    } catch (error) {
      if (error.code === '23503') {
        throw new RepositoryError('FOREIGN_KEY_CONSTRAINT', {
          constraint: error.constraint,
          cause: error
        })
      }

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

  async deleteUserRole(userId, roleId) {
    try {
      const rowResult = await this.query(
        `
        DELETE FROM user_roles
        WHERE user_id=$1 AND role_id=$2;
        `,
        [userId, roleId]
      )

      return rowResult.rowCount > 0
    } catch (error) {
      throw new RepositoryError('DATA_ACCESS_ERROR', { cause: error })
    }
  }
}
