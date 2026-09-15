import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import AuthService from '../../src/app/services/auth.service.js'
import { expectAppError } from './serviceTestAssertions.js'

const username = 'test-user'
const password = 'StrongPassword123!'
const credentials = {
  id: 1,
  username,
  hashedPassword: 'stored-password-hash',
  status: 'active'
}
const user = {
  id: credentials.id,
  email: 'user@example.com',
  fullname: 'Test User',
  username,
  phone: null,
  status: 'active',
  emailVerifiedAt: new Date('2030-01-01T00:00:00.000Z'),
  isDeleted: false
}
const roleCodes = ['CUSTOMER']

let userRepository
let userRoleRepository
let passwordHasher
let tokenService
let authService

beforeEach(() => {
  userRepository = {
    findCredentialsByUsername: vi.fn(),
    findById: vi.fn()
  }
  userRoleRepository = {
    findActiveRoleCodesByUserId: vi.fn()
  }
  passwordHasher = {
    compare: vi.fn()
  }
  tokenService = {
    signAccessToken: vi.fn(),
    verifyAccessToken: vi.fn()
  }
  authService = new AuthService({
    userRepository,
    userRoleRepository,
    passwordHasher,
    tokenService
  })
})

describe('AuthService [login]', () => {
  it('verifies credentials and returns an access token', async () => {
    // Arrange
    userRepository.findCredentialsByUsername.mockResolvedValue(credentials)
    passwordHasher.compare.mockResolvedValue(true)
    tokenService.signAccessToken.mockResolvedValue('signed-access-token')

    // Act
    const result = await authService.login({ username, password })

    // Assert
    expect(result).toEqual({ accessToken: 'signed-access-token' })
    expect(userRepository.findCredentialsByUsername)
      .toHaveBeenCalledExactlyOnceWith(username)
    expect(passwordHasher.compare).toHaveBeenCalledExactlyOnceWith(
      password,
      credentials.hashedPassword
    )
    expect(tokenService.signAccessToken).toHaveBeenCalledExactlyOnceWith({
      sub: String(credentials.id)
    })
  })

  it('does not reveal whether the username exists', async () => {
    // Arrange
    userRepository.findCredentialsByUsername.mockResolvedValue(null)

    // Act
    const loginPromise = authService.login({ username, password })

    // Assert
    await expectAppError(loginPromise, {
      code: 'INVALID_CREDENTIALS',
      message: 'Username or password is incorrect'
    })
    expect(passwordHasher.compare).not.toHaveBeenCalled()
    expect(tokenService.signAccessToken).not.toHaveBeenCalled()
  })

  it('rejects an incorrect password with the same generic error', async () => {
    // Arrange
    userRepository.findCredentialsByUsername.mockResolvedValue(credentials)
    passwordHasher.compare.mockResolvedValue(false)

    // Act
    const loginPromise = authService.login({ username, password: 'incorrect' })

    // Assert
    await expectAppError(loginPromise, {
      code: 'INVALID_CREDENTIALS',
      message: 'Username or password is incorrect'
    })
    expect(tokenService.signAccessToken).not.toHaveBeenCalled()
  })

  it.each(['pending_verification', 'suspended'])(
    'rejects a user with status %s',
    async status => {
      // Arrange
      userRepository.findCredentialsByUsername.mockResolvedValue({
        ...credentials,
        status
      })
      passwordHasher.compare.mockResolvedValue(true)

      // Act
      const loginPromise = authService.login({ username, password })

      // Assert
      await expectAppError(loginPromise, {
        code: 'ACCOUNT_NOT_ACTIVE',
        message: 'User account is not active'
      })
      expect(tokenService.signAccessToken).not.toHaveBeenCalled()
    }
  )

  it('does not expose repository failures', async () => {
    // Arrange
    userRepository.findCredentialsByUsername.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const loginPromise = authService.login({ username, password })

    // Assert
    await expectAppError(loginPromise, {
      code: 'INTERNAL_ERROR',
      message: 'Internal error'
    })
  })

  it('rethrows unexpected dependency failures unchanged', async () => {
    // Arrange
    userRepository.findCredentialsByUsername.mockResolvedValue(credentials)
    const error = new TypeError('Password hasher unavailable')
    passwordHasher.compare.mockRejectedValue(error)

    // Act and assert
    await expect(authService.login({ username, password })).rejects.toBe(error)
  })
})

describe('AuthService [verifyAccessToken]', () => {
  it('returns a current minimal identity with active role codes', async () => {
    // Arrange
    tokenService.verifyAccessToken.mockResolvedValue({ sub: String(user.id) })
    userRepository.findById.mockResolvedValue(user)
    userRoleRepository.findActiveRoleCodesByUserId.mockResolvedValue(roleCodes)

    // Act
    const identity = await authService.verifyAccessToken('access-token')

    // Assert
    expect(identity).toEqual({ id: user.id, roles: roleCodes })
    expect(tokenService.verifyAccessToken).toHaveBeenCalledExactlyOnceWith(
      'access-token'
    )
    expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(user.id)
    expect(userRoleRepository.findActiveRoleCodesByUserId)
      .toHaveBeenCalledExactlyOnceWith(user.id)
  })

  it.each([
    { label: 'verification returns null', payload: null },
    { label: 'subject is missing', payload: {} },
    { label: 'subject is not numeric', payload: { sub: 'not-a-number' } },
    { label: 'subject is zero', payload: { sub: '0' } }
  ])('rejects an invalid token when $label', async ({ payload }) => {
    // Arrange
    tokenService.verifyAccessToken.mockResolvedValue(payload)

    // Act
    const verificationPromise = authService.verifyAccessToken('invalid-token')

    // Assert
    await expectAppError(verificationPromise, {
      code: 'INVALID_ACCESS_TOKEN',
      message: 'Access token is invalid or expired'
    })
    expect(userRepository.findById).not.toHaveBeenCalled()
    expect(userRoleRepository.findActiveRoleCodesByUserId).not.toHaveBeenCalled()
  })

  it('rejects a token belonging to a deleted or missing user', async () => {
    // Arrange
    tokenService.verifyAccessToken.mockResolvedValue({ sub: String(user.id) })
    userRepository.findById.mockResolvedValue(null)

    // Act
    const verificationPromise = authService.verifyAccessToken('access-token')

    // Assert
    await expectAppError(verificationPromise, {
      code: 'INVALID_ACCESS_TOKEN',
      message: 'Access token is invalid or expired'
    })
    expect(userRoleRepository.findActiveRoleCodesByUserId).not.toHaveBeenCalled()
  })

  it.each(['pending_verification', 'suspended'])(
    'rejects a token when the current user status is %s',
    async status => {
      // Arrange
      tokenService.verifyAccessToken.mockResolvedValue({ sub: String(user.id) })
      userRepository.findById.mockResolvedValue({ ...user, status })

      // Act
      const verificationPromise = authService.verifyAccessToken('access-token')

      // Assert
      await expectAppError(verificationPromise, {
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid or expired'
      })
      expect(userRoleRepository.findActiveRoleCodesByUserId).not.toHaveBeenCalled()
    }
  )

  it.each([
    {
      label: 'loading the user',
      arrange: () => {
        tokenService.verifyAccessToken.mockResolvedValue({ sub: String(user.id) })
        userRepository.findById.mockRejectedValue(
          new RepositoryError('DATA_ACCESS_ERROR')
        )
      }
    },
    {
      label: 'loading role codes',
      arrange: () => {
        tokenService.verifyAccessToken.mockResolvedValue({ sub: String(user.id) })
        userRepository.findById.mockResolvedValue(user)
        userRoleRepository.findActiveRoleCodesByUserId.mockRejectedValue(
          new RepositoryError('DATA_ACCESS_ERROR')
        )
      }
    }
  ])('does not expose repository failures while $label', async ({ arrange }) => {
    // Arrange
    arrange()

    // Act
    const verificationPromise = authService.verifyAccessToken('access-token')

    // Assert
    await expectAppError(verificationPromise, {
      code: 'INTERNAL_ERROR',
      message: 'Internal error'
    })
  })

  it('rethrows unexpected token-service failures unchanged', async () => {
    // Arrange
    const error = new TypeError('Token service unavailable')
    tokenService.verifyAccessToken.mockRejectedValue(error)

    // Act and assert
    await expect(authService.verifyAccessToken('access-token')).rejects.toBe(error)
  })
})
