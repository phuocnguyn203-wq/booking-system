import createAppError, { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'
import RepositoryError from '../errors/RepositoryError.js'

function mapRepositoryError(error) {
  if (
    error.code === 'UNIQUE_CONSTRAINT' &&
    error.constraint === 'users_email_key'
  ) {
    return createAppError(Errors.EMAIL_ALREADY_EXISTS)
  }

  if (
    error.code === 'UNIQUE_CONSTRAINT' &&
    error.constraint === 'users_username_key'
  ) {
    return createAppError(Errors.USERNAME_ALREADY_EXISTS)
  }

  if (
    error.code === 'NOT_NULL_CONSTRAINT' ||
    error.code === 'CHECK_CONSTRAINT'
  ) {
    return createAppError(Errors.INVALID_USER_DATA)
  }

  if (error.code === 'NO_UPDATABLE_FIELDS')
    return createAppError(Errors.NO_USER_FIELDS_TO_UPDATE)

  return createAppError(Errors.DATA_ACCESS_ERROR)
}

function throwServiceError(error) {
  if (error instanceof AppError)
    throw error

  if (error instanceof RepositoryError)
    throw mapRepositoryError(error)

  throw error
}

export default class UserService {
  constructor({ userRepository, passwordHasher }) {
    this.userRepository = userRepository
    this.passwordHasher = passwordHasher
  }

  async getUserById(userId) {
    try {
      const user = await this.userRepository.findById(userId)

      if (user === null)
        throw createAppError(Errors.USER_NOT_FOUND)

      return user
    } catch (error) {
      throwServiceError(error)
    }
  }

  async getUserByUsername(username) {
    try {
      const user = await this.userRepository.findByUsername(username)

      if (user === null)
        throw createAppError(Errors.USER_NOT_FOUND)

      return user
    } catch (error) {
      throwServiceError(error)
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await this.userRepository.findByEmail(email)

      if (user === null)
        throw createAppError(Errors.USER_NOT_FOUND)

      return user
    } catch (error) {
      throwServiceError(error)
    }
  }

  async createUser(userInfo) {
    const {
      email,
      fullname,
      username,
      phone,
      password
    } = userInfo ?? {}

    if (typeof password !== 'string' || password.length === 0)
      throw createAppError(Errors.INVALID_USER_DATA)

    try {
      const hashedPassword = await this.passwordHasher.hash(password)
      const createInfo = {
        email,
        fullname,
        username,
        hashedPassword,
        status: 'pending_verification'
      }

      if (phone !== undefined)
        createInfo.phone = phone

      return await this.userRepository.createUser(createInfo)
    } catch (error) {
      throwServiceError(error)
    }
  }

  async updateUser(userId, updateInfo) {
    const updatableFields = ['fullname', 'email', 'phone']
    const filteredUpdate = {}

    for (const field of updatableFields) {
      if (updateInfo?.[field] !== undefined)
        filteredUpdate[field] = updateInfo[field]
    }

    if (Object.keys(filteredUpdate).length === 0)
      throw createAppError(Errors.NO_USER_FIELDS_TO_UPDATE)

    try {
      const user = await this.userRepository.updateUser(
        userId,
        filteredUpdate
      )

      if (user === null)
        throw createAppError(Errors.USER_NOT_FOUND)

      return user
    } catch (error) {
      throwServiceError(error)
    }
  }

  async deactivateUser(userId) {
    try {
      return await this.userRepository.deleteUser(userId)
    } catch (error) {
      throwServiceError(error)
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const credentials = await this.userRepository.findCredentialsById(userId)

      if (credentials === null)
        throw createAppError(Errors.USER_NOT_FOUND)

      const passwordMatches = await this.passwordHasher.compare(
        currentPassword,
        credentials.hashedPassword
      )

      if (!passwordMatches)
        throw createAppError(Errors.INVALID_CURRENT_PASSWORD)

      if (newPassword === currentPassword)
        throw createAppError(Errors.PASSWORD_REUSE_NOT_ALLOWED)

      const hashedPassword = await this.passwordHasher.hash(newPassword)
      const user = await this.userRepository.updateUser(
        userId,
        { hashedPassword }
      )

      if (user === null)
        throw createAppError(Errors.USER_NOT_FOUND)

      return user
    } catch (error) {
      throwServiceError(error)
    }
  }
}
