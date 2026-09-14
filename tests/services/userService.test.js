import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import UserService from '../../src/app/services/users.service.js'
import { expectAppError } from './serviceTestAssertions.js'

const activeUser = {
  id: 1,
  email: 'user@example.com',
  fullname: 'Test User',
  username: 'test-user',
  phone: '0123456789',
  status: 'active',
  emailVerifiedAt: null,
  isDeleted: false
}

let userRepository
let passwordHasher
let userService

beforeEach(() => {
  userRepository = {
    findById: vi.fn(),
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    findCredentialsById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn()
  }
  passwordHasher = {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('hashed-password')
  }

  userService = new UserService({
    userRepository,
    passwordHasher
  })
})

describe('UserService [getUserById]', () => {
  it('returns user information when user exists', async () => {
    // Arrange
    userRepository.findById.mockResolvedValue(activeUser)

    // Act
    const user = await userService.getUserById(activeUser.id)

    // Assert
    expect(user).toEqual(activeUser)
  })

  it('rejects when user does not exist', async () => {
    // Arrange
    userRepository.findById.mockResolvedValue(null)

    // Act
    const userPromise = userService.getUserById(999999)

    // Assert
    await expectAppError(userPromise, {
      code: 'USER_NOT_FOUND'
    })
  })

  it('does not expose a data access error', async () => {
    // Arrange
    userRepository.findById.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const userPromise = userService.getUserById(activeUser.id)

    // Assert
    await expectAppError(userPromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('UserService [getUserByUsername]', () => {
  it('returns user information when username exists', async () => {
    // Arrange
    userRepository.findByUsername.mockResolvedValue(activeUser)

    // Act
    const user = await userService.getUserByUsername(activeUser.username)

    // Assert
    expect(user).toEqual(activeUser)
    expect(userRepository.findByUsername).toHaveBeenCalledWith(
      activeUser.username
    )
  })

  it('rejects when username does not exist', async () => {
    // Arrange
    userRepository.findByUsername.mockResolvedValue(null)

    // Act
    const userPromise = userService.getUserByUsername('unknown-user')

    // Assert
    await expectAppError(userPromise, {
      code: 'USER_NOT_FOUND'
    })
  })
})

describe('UserService [getUserByEmail]', () => {
  it('returns user information when email exists', async () => {
    // Arrange
    userRepository.findByEmail.mockResolvedValue(activeUser)

    // Act
    const user = await userService.getUserByEmail(activeUser.email)

    // Assert
    expect(user).toEqual(activeUser)
    expect(userRepository.findByEmail).toHaveBeenCalledWith(activeUser.email)
  })

  it('rejects when email does not exist', async () => {
    // Arrange
    userRepository.findByEmail.mockResolvedValue(null)

    // Act
    const userPromise = userService.getUserByEmail('unknown@example.com')

    // Assert
    await expectAppError(userPromise, {
      code: 'USER_NOT_FOUND'
    })
  })
})

describe('UserService [createUser]', () => {
  it('creates a user with pending verification status by default', async () => {
    // Arrange
    const userInfo = {
      email: activeUser.email,
      fullname: activeUser.fullname,
      username: activeUser.username,
      phone: activeUser.phone,
      password: 'StrongPassword123!'
    }
    const createdUser = {
      ...activeUser,
      status: 'pending_verification'
    }
    userRepository.createUser.mockResolvedValue(createdUser)

    // Act
    const user = await userService.createUser(userInfo)

    // Assert
    expect(user).toEqual(createdUser)
    expect(passwordHasher.hash).toHaveBeenCalledWith(userInfo.password)
    expect(userRepository.createUser).toHaveBeenCalledWith({
      email: userInfo.email,
      fullname: userInfo.fullname,
      username: userInfo.username,
      phone: userInfo.phone,
      hashedPassword: 'hashed-password',
      status: 'pending_verification'
    })
  })

  it('does not allow caller to override the initial status', async () => {
    // Arrange
    const userInfo = {
      email: activeUser.email,
      fullname: activeUser.fullname,
      username: activeUser.username,
      password: 'StrongPassword123!',
      status: 'active'
    }
    const createdUser = {
      ...activeUser,
      status: 'pending_verification'
    }
    userRepository.createUser.mockResolvedValue(createdUser)

    // Act
    const user = await userService.createUser(userInfo)

    // Assert
    expect(user).toEqual(createdUser)
    expect(userRepository.createUser).toHaveBeenCalledWith({
      email: userInfo.email,
      fullname: userInfo.fullname,
      username: userInfo.username,
      hashedPassword: 'hashed-password',
      status: 'pending_verification'
    })
  })

  it('rejects when password is missing', async () => {
    // Arrange
    const userInfo = {
      email: activeUser.email,
      fullname: activeUser.fullname,
      username: activeUser.username
    }

    // Act
    const userPromise = userService.createUser(userInfo)

    // Assert
    await expectAppError(userPromise, {
      code: 'INVALID_USER_DATA'
    })
    expect(passwordHasher.hash).not.toHaveBeenCalled()
    expect(userRepository.createUser).not.toHaveBeenCalled()
  })

  it('rejects when email already exists', async () => {
    // Arrange
    userRepository.createUser.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'users_email_key'
      })
    )

    // Act
    const userPromise = userService.createUser({
      email: activeUser.email,
      username: 'another-user',
      password: 'StrongPassword123!'
    })

    // Assert
    await expectAppError(userPromise, {
      code: 'EMAIL_ALREADY_EXISTS'
    })
  })

  it('rejects when username already exists', async () => {
    // Arrange
    userRepository.createUser.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'users_username_key'
      })
    )

    // Act
    const userPromise = userService.createUser({
      email: 'another@example.com',
      username: activeUser.username,
      password: 'StrongPassword123!'
    })

    // Assert
    await expectAppError(userPromise, {
      code: 'USERNAME_ALREADY_EXISTS'
    })
  })

  it('rejects invalid user data', async () => {
    // Arrange
    userRepository.createUser.mockRejectedValue(
      new RepositoryError('CHECK_CONSTRAINT', {
        constraint: 'email_validation'
      })
    )

    // Act
    const userPromise = userService.createUser({
      email: '.invalid@example.com',
      username: activeUser.username,
      password: 'StrongPassword123!'
    })

    // Assert
    await expectAppError(userPromise, {
      code: 'INVALID_USER_DATA'
    })
  })

  it('does not expose a data access error', async () => {
    // Arrange
    userRepository.createUser.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const userPromise = userService.createUser({
      email: activeUser.email,
      username: activeUser.username,
      password: 'StrongPassword123!'
    })

    // Assert
    await expectAppError(userPromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('UserService [updateUser]', () => {
  it('updates only public profile fields', async () => {
    // Arrange
    const updateInfo = {
      fullname: 'Updated User',
      email: 'updated@example.com',
      phone: '0987654321',
      status: 'suspended',
      hashedPassword: 'new-hash',
      emailVerifiedAt: new Date(),
      unknownField: 'ignored'
    }
    const expectedUpdate = {
      fullname: updateInfo.fullname,
      email: updateInfo.email,
      phone: updateInfo.phone
    }
    const updatedUser = {
      ...activeUser,
      ...expectedUpdate
    }
    userRepository.updateUser.mockResolvedValue(updatedUser)

    // Act
    const user = await userService.updateUser(activeUser.id, updateInfo)

    // Assert
    expect(user).toEqual(updatedUser)
    expect(userRepository.updateUser).toHaveBeenCalledWith(
      activeUser.id,
      expectedUpdate
    )
  })

  it('rejects when no public profile fields are provided', async () => {
    // Arrange
    const invalidUpdateInfo = {
      status: 'suspended',
      hashedPassword: 'new-hash',
      emailVerifiedAt: new Date()
    }

    // Act
    const userPromise = userService.updateUser(
      activeUser.id,
      invalidUpdateInfo
    )

    // Assert
    await expectAppError(userPromise, {
      code: 'NO_USER_FIELDS_TO_UPDATE'
    })
    expect(userRepository.updateUser).not.toHaveBeenCalled()
  })

  it('rejects when user does not exist', async () => {
    // Arrange
    userRepository.updateUser.mockResolvedValue(null)

    // Act
    const userPromise = userService.updateUser(999999, {
      fullname: 'Updated User'
    })

    // Assert
    await expectAppError(userPromise, {
      code: 'USER_NOT_FOUND'
    })
  })

  it('rejects when updated email already exists', async () => {
    // Arrange
    userRepository.updateUser.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'users_email_key'
      })
    )

    // Act
    const userPromise = userService.updateUser(activeUser.id, {
      email: 'existing@example.com'
    })

    // Assert
    await expectAppError(userPromise, {
      code: 'EMAIL_ALREADY_EXISTS'
    })
  })

  it('does not expose a data access error', async () => {
    // Arrange
    userRepository.updateUser.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const userPromise = userService.updateUser(activeUser.id, {
      fullname: 'Updated User'
    })

    // Assert
    await expectAppError(userPromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('UserService [deactivateUser]', () => {
  it('returns true when user is soft deleted', async () => {
    // Arrange
    userRepository.deleteUser.mockResolvedValue(true)

    // Act
    const deactivated = await userService.deactivateUser(activeUser.id)

    // Assert
    expect(deactivated).toBe(true)
    expect(userRepository.deleteUser).toHaveBeenCalledWith(activeUser.id)
  })

  it('returns false when user is already deleted or does not exist', async () => {
    // Arrange
    userRepository.deleteUser.mockResolvedValue(false)

    // Act
    const deactivated = await userService.deactivateUser(999999)

    // Assert
    expect(deactivated).toBe(false)
  })

  it('does not expose a data access error', async () => {
    // Arrange
    userRepository.deleteUser.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const userPromise = userService.deactivateUser(activeUser.id)

    // Assert
    await expectAppError(userPromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('UserService [changePassword]', () => {
  const currentPassword = 'CurrentPassword123!'
  const newPassword = 'NewPassword456!'
  const credentials = {
    id: activeUser.id,
    hashedPassword: 'stored-password-hash'
  }

  it('verifies, hashes and updates the new password', async () => {
    // Arrange
    userRepository.findCredentialsById.mockResolvedValue(credentials)
    passwordHasher.compare.mockResolvedValue(true)
    passwordHasher.hash.mockResolvedValue('new-password-hash')
    userRepository.updateUser.mockResolvedValue(activeUser)

    // Act
    const user = await userService.changePassword(
      activeUser.id,
      currentPassword,
      newPassword
    )

    // Assert
    expect(user).toEqual(activeUser)
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      currentPassword,
      credentials.hashedPassword
    )
    expect(passwordHasher.hash).toHaveBeenCalledWith(newPassword)
    expect(userRepository.updateUser).toHaveBeenCalledWith(
      activeUser.id,
      { hashedPassword: 'new-password-hash' }
    )
  })

  it('rejects when user credentials do not exist', async () => {
    // Arrange
    userRepository.findCredentialsById.mockResolvedValue(null)

    // Act
    const userPromise = userService.changePassword(
      999999,
      currentPassword,
      newPassword
    )

    // Assert
    await expectAppError(userPromise, {
      code: 'USER_NOT_FOUND'
    })
    expect(passwordHasher.compare).not.toHaveBeenCalled()
    expect(passwordHasher.hash).not.toHaveBeenCalled()
    expect(userRepository.updateUser).not.toHaveBeenCalled()
  })

  it('rejects when current password is incorrect', async () => {
    // Arrange
    userRepository.findCredentialsById.mockResolvedValue(credentials)
    passwordHasher.compare.mockResolvedValue(false)

    // Act
    const userPromise = userService.changePassword(
      activeUser.id,
      'IncorrectPassword123!',
      newPassword
    )

    // Assert
    await expectAppError(userPromise, {
      code: 'INVALID_CURRENT_PASSWORD'
    })
    expect(passwordHasher.hash).not.toHaveBeenCalled()
    expect(userRepository.updateUser).not.toHaveBeenCalled()
  })

  it('rejects reusing the current password', async () => {
    // Arrange
    userRepository.findCredentialsById.mockResolvedValue(credentials)
    passwordHasher.compare.mockResolvedValue(true)

    // Act
    const userPromise = userService.changePassword(
      activeUser.id,
      currentPassword,
      currentPassword
    )

    // Assert
    await expectAppError(userPromise, {
      code: 'PASSWORD_REUSE_NOT_ALLOWED'
    })
    expect(passwordHasher.hash).not.toHaveBeenCalled()
    expect(userRepository.updateUser).not.toHaveBeenCalled()
  })

  it('rejects when user disappears before password is updated', async () => {
    // Arrange
    userRepository.findCredentialsById.mockResolvedValue(credentials)
    passwordHasher.compare.mockResolvedValue(true)
    passwordHasher.hash.mockResolvedValue('new-password-hash')
    userRepository.updateUser.mockResolvedValue(null)

    // Act
    const userPromise = userService.changePassword(
      activeUser.id,
      currentPassword,
      newPassword
    )

    // Assert
    await expectAppError(userPromise, {
      code: 'USER_NOT_FOUND'
    })
  })

  it('does not expose a credentials data access error', async () => {
    // Arrange
    userRepository.findCredentialsById.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const userPromise = userService.changePassword(
      activeUser.id,
      currentPassword,
      newPassword
    )

    // Assert
    await expectAppError(userPromise, {
      code: 'INTERNAL_ERROR'
    })
  })

  it('does not expose an update data access error', async () => {
    // Arrange
    userRepository.findCredentialsById.mockResolvedValue(credentials)
    passwordHasher.compare.mockResolvedValue(true)
    passwordHasher.hash.mockResolvedValue('new-password-hash')
    userRepository.updateUser.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const userPromise = userService.changePassword(
      activeUser.id,
      currentPassword,
      newPassword
    )

    // Assert
    await expectAppError(userPromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})
