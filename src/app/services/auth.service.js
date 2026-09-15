import createAppError, { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'
import RepositoryError from '../errors/RepositoryError.js'

function throwServiceError(error) {
  if (error instanceof AppError)
    throw error

  if (error instanceof RepositoryError)
    throw createAppError(Errors.DATA_ACCESS_ERROR)

  throw error
}

function parseUserId(payload) {
  const userId = Number(payload?.sub)

  if (!Number.isSafeInteger(userId) || userId <= 0)
    return null

  return userId
}

export default class AuthService {
  constructor({
    userRepository,
    userRoleRepository,
    passwordHasher,
    tokenService
  }) {
    this.userRepository = userRepository
    this.userRoleRepository = userRoleRepository
    this.passwordHasher = passwordHasher
    this.tokenService = tokenService
  }

  async login(loginInfo) {
    const { username, password } = loginInfo ?? {}

    try {
      if (
        typeof username !== 'string' || username.length === 0 ||
        typeof password !== 'string' || password.length === 0
      ) {
        throw createAppError(Errors.INVALID_CREDENTIALS)
      }

      const credentials = await this.userRepository
        .findCredentialsByUsername(username)

      if (credentials === null)
        throw createAppError(Errors.INVALID_CREDENTIALS)

      const passwordMatches = await this.passwordHasher.compare(
        password,
        credentials.hashedPassword
      )

      if (!passwordMatches)
        throw createAppError(Errors.INVALID_CREDENTIALS)

      if (credentials.status !== 'active')
        throw createAppError(Errors.ACCOUNT_NOT_ACTIVE)

      const accessToken = await this.tokenService.signAccessToken({
        sub: String(credentials.id)
      })

      return { accessToken }
    } catch (error) {
      throwServiceError(error)
    }
  }

  async verifyAccessToken(token) {
    try {
      const payload = await this.tokenService.verifyAccessToken(token)
      const userId = parseUserId(payload)

      if (userId === null)
        throw createAppError(Errors.INVALID_ACCESS_TOKEN)

      const user = await this.userRepository.findById(userId)

      if (user === null || user.status !== 'active')
        throw createAppError(Errors.INVALID_ACCESS_TOKEN)

      const roles = await this.userRoleRepository
        .findActiveRoleCodesByUserId(userId)

      return { id: user.id, roles }
    } catch (error) {
      throwServiceError(error)
    }
  }
}
