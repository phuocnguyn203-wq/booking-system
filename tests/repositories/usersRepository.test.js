import { describe, it, afterAll, beforeEach, expect } from 'vitest'
import { query } from '../../src/database/index.js'
import { UserRepository } from '../../src/app/repositories/users.repository.js'

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
  hashedPassword='fake-hashed-password'
 } = {}) {
  const rowResult = await query(`
    INSERT INTO users (email, fullname, username, hashed_password)
    VALUES
    ($1, $2, $3, $4)
    RETURNING *
    `,
    [email, fullname, username, hashedPassword]
  )

  const user = rowResult.rows[0]
  return {
    id: user.id,
    email: user.email,
    fullname: user.fullname,
    username: user.username,
    hashedPassword: user.hashedPassword
  }
}

describe('UserRepository [getById]', () => {
  it('returns user when given id', async () => {
    // Arrange
    const userRepository = new UserRepository(query)
    const testUser = await createTestUser()

    // Act
    const user = await userRepository.findById(testUser.id)

    // Assert
    expect(user.id).toBe(testUser.id)
    expect(user.fullname).toBe(testUser.fullname)
    expect(user.email).toBe(testUser.email)
  })

  it('returns null when given non-exist id', async () => {
    // Arrange
    const userRepository = new UserRepository(query)
    const nonExistId = 999

    // Act
    const user = await userRepository.findById(nonExistId)

    // Assert
    expect(user).toBeNull()
  })
})

describe('UserRepository [createUser]', () => {
  it('returns and adds user to database when given email and hashedPassword', async () => {
    // Arrange
    const userRepository = new UserRepository(query)
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
    expect(userInDb.id).toBe(newUser.id)
  })

  it('throws AppError and doesn\'t user to database when given duplicated username', async () => {
    // Arrange
    const userRepository = new UserRepository(query)
    const duplicatedName = 'John'
    const userInfoDuplicatedname = {
      fullname: 'Tester1',
      email: 'tester1@gmail.com',
      username: duplicatedName,
      hashedPassword: 'fake-hashed-password'
    }
    const testUser = await createTestUser({ name: duplicatedName })

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

  it('throws AppError and doesn\'t user to database when given duplicated email', async () => {
    // Arrange
    const userRepository = new UserRepository(query)
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

  it('throws AppError and doesn\'t add user to database when given nothing', async () => {
    // Arrange
    const userRepository = new UserRepository(query)
    
    // Act
    const user = userRepository.createUser({})

    // Expect
    await expect(user).rejects.toMatchObject({
      statusCode: 400,
      message: 'Required field is missing'
    })
  })

  it('throws AppErrors and doesn\'t add user to database when given invalid email', async () => {
    // Arrange
    const userRepository = new UserRepository(query)
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