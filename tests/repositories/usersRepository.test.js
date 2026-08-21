import { describe, afterAll, beforeEach, expect } from 'vitest'
import { it as baseIt } from 'vitest'
import { query } from '../../src/database/index.js'
import UserRepository from '../../src/app/repositories/users.repository.js'

const it = baseIt.extend('userRepository', () => {
  return new UserRepository(query)
})

const CLEAN_QUERY = `
  DELETE FROM bookings;
  DELETE FROM users;
  DELETE FROM rooms;
`

beforeEach(async () => {
  await query(CLEAN_QUERY)
})

afterAll(async() => {
  await query(CLEAN_QUERY)
})

async function createTestUser({ 
  email='testUser@gmail.com', 
  fullname='Tester User',
  username='tester1',
  hashedPassword='fake-hashed-password',
  isDeleted=false
 } = {}) {
  const rowResult = await query(`
    INSERT INTO users (email, fullname, username, hashed_password, is_deleted)
    VALUES
    ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [email, fullname, username, hashedPassword, isDeleted]
  )

  const user = rowResult.rows[0]
  return {
    id: parseInt(user.id, 10),
    email: user.email,
    fullname: user.fullname,
    username: user.username,
    hashedPassword: user.hashedPassword,
    isDeleted: user.isDeleted
  }
}

describe('UserRepository [getById]', () => {
  it('returns user when given id', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()

    // Act
    const user = await userRepository.findById(testUser.id)

    // Assert
    expect(user.id).toBe(testUser.id)
    expect(user.fullname).toBe(testUser.fullname)
    expect(user.email).toBe(testUser.email)
  })

  it('returns null when given non-exist id', async ({ userRepository }) => {
    // Arrange
    const nonExistId = 999

    // Act
    const user = await userRepository.findById(nonExistId)

    // Assert
    expect(user).toBeNull()
  })
})

describe('UserRepository [createUser]', () => {
  it('returns and adds user to database when given email and hashedPassword', async ({ userRepository }) => {
    // Arrange
    const userInfo = {
      fullname: 'Tester1',
      email: 'tester1@gmail.com',
      username: 'tester1',
      hashedPassword: 'fake-hashed-password'
    }
    // Act
    const newUser = await userRepository.createUser(userInfo)

    // Assert
    expect(newUser).toEqual(expect.objectContaining(userInfo))
    // Assert side effect
    const rowResult = await query(`SELECT id FROM users WHERE id=$1`, [newUser.id])
    const userInDb = rowResult.rows[0]
    expect(userInDb.id).toBe(newUser.id.toString())
  })

  it('throws AppError and doesn\'t user to database when given duplicated username', async ({ userRepository }) => {
    // Arrange
    const duplicatedName = 'John'
    const userInfoDuplicatedname = {
      fullname: 'Tester1',
      email: 'tester1@gmail.com',
      username: duplicatedName,
      hashedPassword: 'fake-hashed-password'
    }
    const testUser = await createTestUser({ username: duplicatedName })

    // Act
    const user = userRepository.createUser(userInfoDuplicatedname)
    // Assert
    await expect(user).rejects.toMatchObject({
      statusCode: 409,
      message: 'An account with provided information already exists.'
    })
    // Assert side effect
    const rowResult = await query(`SELECT id FROM users WHERE id=$1`, [testUser.id])
    expect(rowResult.rows.length).toBe(1)
  })

  it('throws AppError and doesn\'t user to database when given duplicated email', async ({ userRepository }) => {
    // Arrange
    const duplicatedEmail = 'john@gmail.com'
    const userInfoDuplicatedname = {
      fullname: 'Tester1',
      email: duplicatedEmail,
      username: 'tester1',
      hashedPassword: 'fake-hashed-password'
    }
    const testUser = await createTestUser({ email: duplicatedEmail })

    // Act
    const user = userRepository.createUser(userInfoDuplicatedname)

    // Assert
    expect(user).rejects.toMatchObject({
      statusCode: 409,
      message: 'An account with provided information already exists.'
    })
    // Assert side effect
    const rowResult = await query(`SELECT id FROM users WHERE id=$1`, [testUser.id])
    expect(rowResult.rows.length).toBe(1)
  })

  it('throws AppError and doesn\'t add user to database when given nothing', async ({ userRepository }) => {
    // Arrange
    
    // Act
    const user = userRepository.createUser({})

    // Expect
    await expect(user).rejects.toMatchObject({
      statusCode: 400,
      message: 'Required field is missing'
    })
  })

  it('throws AppErrors and doesn\'t add user to database when given invalid email', async ({ userRepository }) => {
    // Arrange
    const invalidEmail = '.invalid@example.com'
    const userInfoDuplicatedname = {
      fullname: 'Tester1',
      email: invalidEmail,
      username: 'tester1',
      hashedPassword: 'fake-hashed-password'
    }

    // Act
    const user = userRepository.createUser(userInfoDuplicatedname)

    // Assert
    await expect(user).rejects.toMatchObject({
      statusCode: 400,
      message: 'Email is not valid'
    })
  })
})

describe('UserRepository [updateUser]', () => {
  it('returns newUser and updates user in database', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const updateInfo = { fullname: 'New Fullname', email: 'newemail@gmail.com' }

    // Act
    const user = await userRepository.updateUser(testUser.id, updateInfo)

    // Assert
    expect(user).toMatchObject(updateInfo)
    // Assert side effect
    const rowResult = await query(
      `
      SELECT * FROM users
      WHERE id=$1
      `,
      [testUser.id]
    )
    const userInDb = rowResult.rows[0]
    expect(userInDb).toMatchObject(updateInfo)
  })

  it('throws AppError when it\'s given all invalid fields', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const invalidFieldUpdate = { myUserName: 'John', newEmail: 'newEmail@gmail.com' }

    // Act
    const user = userRepository.updateUser(testUser.id, invalidFieldUpdate)

    // Assert
    await expect(user).rejects.toMatchObject({
      statusCode: 400,
      message: 'Field names are not correct.'
    })
    // Assert side effect
    const rowResult = await query(`SELECT * FROM users WHERE id=$1`, [testUser.id])
    const userInDb = rowResult.rows[0]
    expect(userInDb).not.toMatchObject(invalidFieldUpdate)
  })

  it('returns null when it doesn\'t find user match given id', async ({ userRepository }) => {
    // Arrange
    const nonExistId = 999
    const updateInfo = { fullname: 'New Fullname', email: 'newemail@gmail.com' }
    
    // Act
    const user = await userRepository.updateUser(nonExistId, updateInfo)
    
    // Assert
    expect(user).toBeNull()
  })
})

describe('UserRepository [deleteUser]', () => {
  it('returns number of row affected and soft deletes user when given id', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser()

    // Act
    const rowAffected = await userRepository.deleteUser(testUser.id)

    // Assert
    expect(rowAffected).toBe(1)
    // Assert side effect
    const rowResult = await query(`SELECT id FROM users WHERE id=$1 AND is_deleted=true`, [testUser.id])
    expect(rowResult.rows.length).toBe(1)
  })

  it('returns 0 when given user deleted already', async ({ userRepository }) => {
    // Arrange
    const testUser = await createTestUser({ isDeleted: true })

    // Act
    const rowAffected = await userRepository.deleteUser(testUser.id)

    // Assert
    expect(rowAffected).toBe(0)
  })
})