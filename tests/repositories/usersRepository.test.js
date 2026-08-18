import { describe, it, afterAll, beforeEach } from 'vitest'
import { query } from '../../src/database/index.js'

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