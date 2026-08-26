import { describe, expect } from 'vitest'
import { it as baseIt } from 'vitest'
import { query } from '../../src/database/index.js'
import { cleanBeforeEachAndAfterAll, createTestUser } from './testHelper.js'
import { expectRepositoryError } from './repositoryTestAssertions.js'
import UserRepository from '../../src/app/repositories/users.repository.js'

const it = baseIt.extend('userRepository', () => {
  return new UserRepository(query)
})

/*
User object:
- id: Number,
- email: String
- fullname: String
- username: String
- phone: String
- status: String
- emailVerifiedAt: Date | null
- isDeleted: Boolean
*/

await cleanBeforeEachAndAfterAll()

describe('UserRepository [findById]', () => {
  it('returns user when given id', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()

    // Act
    const user = await userRepository.findById(testUser.id)

    // Assert
    expect(user).toMatchObject(testUser)
  })

  it('returns null when given non-exist id', async ({ userRepository }) => {
    // Arrange
    const nonExistId = 999

    // Act
    const user = await userRepository.findById(nonExistId)

    // Assert
    expect(user).toBeNull()
  })

  it('returns null when given deleted user id', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser({ isDeleted: true })

    // Act
    const user = await userRepository.findById(testUser.id)

    // Assert
    expect(user).toBeNull()
  })

  it('returns suspended status so the service can evaluate user eligibility', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser({ status: 'suspended' })

    // Act
    const user = await userRepository.findById(testUser.id)

    // Assert
    expect(user.status).toBe('suspended')
  })
})

describe('UserRepository [createUser]', () => {
  it('returns and adds user to database when given valid user information', async ({ userRepository }) => {
    // Arrange
    const userInfo = {
      email: 'tester1@gmail.com',
      fullname: 'Tester1',
      username: 'tester1',
      phone: '0123456789',
      status: 'active'
    }
    const createInfo = { hashedPassword: 'fake-hashed-password', ...userInfo }
    // Act
    const newUser = await userRepository.createUser(createInfo)

    // Assert
    expect(newUser).toMatchObject(userInfo)
    // Assert side effect
    const rowResult = await query(`SELECT id FROM users WHERE id=$1`, [newUser.id])
    const userInDb = rowResult.rows[0]
    expect(userInDb.id).toBe(newUser.id.toString())
  })

  it('rejects with a unique constraint error when given duplicated username', async ({ userRepository }) => {
    // Arrange
    const duplicatedUsername = 'johndoe'
    const userInfoDuplicatedUsername = {
      email: 'john@gmail.com',
      fullname: 'JohnDoe',
      username: duplicatedUsername,
      phone: '0123456789',
      status: 'active',
      hashedPassword: 'fake-hashed-password'
    }
    await createTestUser({ username: duplicatedUsername })

    // Act
    const user = userRepository.createUser(userInfoDuplicatedUsername)
    // Assert
    await expectRepositoryError(user, {
      code: 'UNIQUE_CONSTRAINT',
      constraint: 'users_username_key'
    })
  })

  it('rejects with a unique constraint error when given duplicated email', async ({ userRepository }) => {
    // Arrange
    const duplicatedEmail = 'john@gmail.com'
    const userInfoDuplicatedEmail = {
      email: duplicatedEmail,
      fullname: 'JohnDoe',
      username: 'johndoe',
      phone: '0123456789',
      status: 'active',
      hashedPassword: 'fake-hashed-password'
    }
    await createTestUser({ email: duplicatedEmail })

    // Act
    const user = userRepository.createUser(userInfoDuplicatedEmail)

    // Assert
    await expectRepositoryError(user, {
      code: 'UNIQUE_CONSTRAINT',
      constraint: 'users_email_key'
    })
  })

  it('rejects with a not-null constraint error when required data is missing', async ({ userRepository }) => {
    // Arrange
    
    // Act
    const user = userRepository.createUser({})

    // Expect
    await expectRepositoryError(user, {
      code: 'NOT_NULL_CONSTRAINT',
      column: 'email'
    })
  })

  it('rejects with a check constraint error when given invalid email', async ({ userRepository }) => {
    // Arrange
    const invalidEmail = '.invalid@example.com'
    const userInfoInvalid = {
      email: invalidEmail,
      fullname: 'JohnDoe',
      username: 'johndoe',
      phone: '0123456789',
      status: 'active',
      hashedPassword: 'fake-hashed-password'
    }

    // Act
    const user = userRepository.createUser(userInfoInvalid)

    // Assert
    await expectRepositoryError(user, {
      code: 'CHECK_CONSTRAINT',
      constraint: 'email_validation'
    })
  })
})

describe('UserRepository [updateUser]', () => {
  it('returns newUser and updates user in database', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const updateInfo = { status: 'suspended' }

    // Act
    const user = await userRepository.updateUser(testUser.id, updateInfo)

    // Assert
    expect(user).toMatchObject(updateInfo)
    // Assert side effect
    const rowResult = await query(`SELECT * FROM users WHERE id=$1`, [testUser.id])
    const userInDb = rowResult.rows[0]
    expect(userInDb).toMatchObject(updateInfo)
  })

  it('returns null when given id of deleted user', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser({ isDeleted: true })
    const updateInfo = { email: 'helloworld@gmail.com' }

    // Act
    const user = await userRepository.updateUser(testUser.id, updateInfo)

    // Assert
    expect(user).toBeNull()
  })

  it('rejects with a repository input error when no updatable fields are provided', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const invalidFieldUpdate = { myUserName: 'John', newEmail: 'newEmail@gmail.com' }

    // Act
    const user = userRepository.updateUser(testUser.id, invalidFieldUpdate)

    // Assert
    await expectRepositoryError(user, {
      code: 'NO_UPDATABLE_FIELDS'
    })
  })

  it('returns null when it doesn\'t find user match given id', async ({ userRepository }) => {
    // Arrange
    const nonExistId = 999
    const updateInfo = { fullName: 'New Fullname', email: 'newemail@gmail.com' }
    
    // Act
    const user = await userRepository.updateUser(nonExistId, updateInfo)
    
    // Assert
    expect(user).toBeNull()
  })
})

describe('UserRepository [deleteUser]', () => {
  it('returns true and soft deletes user when given id', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()

    // Act
    const isDeleted = await userRepository.deleteUser(testUser.id)

    // Assert
    expect(isDeleted).toBe(true)
    // Assert side effect
    const rowResult = await query(`SELECT id, is_deleted FROM users WHERE id=$1`, [testUser.id])
    expect(rowResult.rows[0].id).toBe(String(testUser.id))
    expect(rowResult.rows[0].is_deleted).toBe(true)
  })

  it('returns false when given user deleted already', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser({ isDeleted: true })

    // Act
    const isDeleted = await userRepository.deleteUser(testUser.id)

    // Assert
    expect(isDeleted).toBe(false)
  })
})
