import createAppError, { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'
import RepositoryError from '../errors/RepositoryError.js'

function mapRepositoryError(error) {
  if (
    error.code === 'UNIQUE_CONSTRAINT' &&
    error.constraint === 'roles_code_key'
  ) {
    return createAppError(Errors.ROLE_CODE_ALREADY_EXISTS)
  }

  if (error.code === 'NO_UPDATABLE_FIELDS')
    return createAppError(Errors.NO_ROLE_FIELDS_TO_UPDATE)

  return createAppError(Errors.DATA_ACCESS_ERROR)
}

function throwServiceError(error) {
  if (error instanceof AppError)
    throw error

  if (error instanceof RepositoryError)
    throw mapRepositoryError(error)

  throw error
}

export default class RoleService {
  constructor({ roleRepository }) {
    this.roleRepository = roleRepository
  }

  async getRoleById(roleId) {
    try {
      const role = await this.roleRepository.findById(roleId)

      if (role === null)
        throw createAppError(Errors.ROLE_NOT_FOUND)

      return role
    } catch (error) {
      throwServiceError(error)
    }
  }

  async createRole(roleInfo) {
    try {
      return await this.roleRepository.createRole(roleInfo)
    } catch (error) {
      throwServiceError(error)
    }
  }

  async updateRole(roleId, updateInfo) {
    const updatableFields = ['name', 'description']
    const filteredUpdate = {}

    for (const field of updatableFields) {
      if (updateInfo?.[field] !== undefined)
        filteredUpdate[field] = updateInfo[field]
    }

    if (Object.keys(filteredUpdate).length === 0)
      throw createAppError(Errors.NO_ROLE_FIELDS_TO_UPDATE)

    try {
      const role = await this.roleRepository.updateRole(
        roleId,
        filteredUpdate
      )

      if (role === null)
        throw createAppError(Errors.ROLE_NOT_FOUND)

      return role
    } catch (error) {
      throwServiceError(error)
    }
  }

  async deactivateRole(roleId) {
    try {
      const role = await this.getRoleById(roleId)

      if (!role.isActive)
        return role

      const deactivatedRole = await this.roleRepository.updateRole(
        roleId,
        { isActive: false }
      )

      if (deactivatedRole === null)
        throw createAppError(Errors.ROLE_NOT_FOUND)

      return deactivatedRole
    } catch (error) {
      throwServiceError(error)
    }
  }
}
