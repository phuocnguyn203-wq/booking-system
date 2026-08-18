import { describe, it, afterAll, beforeEach } from 'vitest'
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

async function createTestUser({ email='testUser@gmail.com', fullname='Tester User' }={}) {
  const rowResult = await query(`
    INSERT INTO users (email, fullname)
    VALUES
    ($1, $2)
    RETURNING *
    `,
    [email, fullname]
  )

  const user = rowResult.rows[0]
  return {
    id: user.id,
    email: user.email,
    fullname: user.fullname
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
    const user = await userRepository.findById(nonExistid)

    // Assert
    expect(user).toBeNull()
  })
})