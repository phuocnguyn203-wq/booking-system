import createAppError, { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'
import RepositoryError from '../errors/RepositoryError.js'

function mapRepositoryError(error) {
  if (
    error.code === 'UNIQUE_CONSTRAINT' &&
    error.constraint === 'user_roles_pk'
  ) {
    return createAppError(Errors.ROLE_ALREADY_ASSIGNED)
  }

  if (
    error.code === 'FOREIGN_KEY_CONSTRAINT' &&
    error.constraint === 'user_roles_user_fk'
  ) {
    return createAppError(Errors.USER_NOT_FOUND)
  }

  if (
    error.code === 'FOREIGN_KEY_CONSTRAINT' &&
    error.constraint === 'user_roles_role_fk'
  ) {
    return createAppError(Errors.ROLE_NOT_FOUND)
  }

  return createAppError(Errors.DATA_ACCESS_ERROR)
}

export default class UserRoleService {
  constructor({ userRepository, roleRepository, userRoleRepository }) {
    this.userRepository = userRepository
    this.roleRepository = roleRepository
    this.userRoleRepository = userRoleRepository
  }

  async addUserRole(userId, roleId) {
    try {
      const user = await this.userRepository.findById(userId)

      if (user === null)
        throw createAppError(Errors.USER_NOT_FOUND)

      if (user.status === 'suspended')
        throw createAppError(Errors.USER_SUSPENDED)

      const role = await this.roleRepository.findById(roleId)

      if (role === null)
        throw createAppError(Errors.ROLE_NOT_FOUND)

      if (!role.isActive)
        throw createAppError(Errors.ROLE_INACTIVE)

      return await this.userRoleRepository.addUserRole(userId, roleId)
    } catch (error) {
      if (error instanceof AppError)
        throw error

      if (error instanceof RepositoryError)
        throw mapRepositoryError(error)

      throw error
    }
  }

  async removeUserRole(userId, roleId) {
    try {
      return await this.userRoleRepository.deleteUserRole(userId, roleId)
    } catch (error) {
      if (error instanceof AppError)
        throw error

      if (error instanceof RepositoryError)
        throw mapRepositoryError(error)

      throw error
    }
  }
}
