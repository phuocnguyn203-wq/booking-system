import { beforeEach, afterAll } from 'vitest'
import { query } from '../../src/database/index.js'

const CLEAN_QUERY = `
  DELETE FROM bookings;
  DELETE FROM users;
  DELETE FROM rooms;
`
export async function cleanBeforeEachAndAfterAll() {
  beforeEach(async () => {
    await query(CLEAN_QUERY)
  })

  afterAll(async() => {
    await query(CLEAN_QUERY)
  })
}
