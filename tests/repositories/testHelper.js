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

export async function createTestRoom({ name="Room 1", pricePerNight=200, isDeleted=false } = {}) {

  const result = await query(
    `
    INSERT INTO rooms (name, price_per_night, is_deleted)
    VALUES
    ($1, $2, $3)
    RETURNING *;
    `,
    [name, pricePerNight, isDeleted],
  )

  const room = result.rows[0]
  return {
    id: Number(room.id),
    name: room.name,
    pricePerNight: Number(room.price_per_night),
    createdAt: Date(room.created_at),
    isDeleted: room.is_deleted,
  }
}

export async function createTestUser({ 
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
    id: Number(user.id),
    email: user.email,
    fullname: user.fullname,
    username: user.username,
    hashedPassword: user.hashedPassword,
    isDeleted: user.isDeleted
  }
}

export async function createTestBooking({ 
  userId,
  roomId, 
  checkInDate = new Date(Date.now() - 24 * 60 * 60 * 1000), 
  checkOutDate = new Date(Date.now()),
  status = 'completed',
  isDeleted = false
}) {
  const rowResult = await query(
    `
    INSERT INTO bookings (user_id, room_id, check_in, check_out, status, is_deleted)
    VALUES
    ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [userId, roomId, checkInDate, checkOutDate, status, isDeleted]
  )

  const booking = rowResult.rows[0]
  return {
    id: Number(booking.id),
    userId: Number(booking.user_id),
    roomId: Number(booking.room_id),
    checkInDate: booking.check_in,
    checkOutDate: booking.check_out
  }
}

// booking needs to have user and room so i create both user and room here
export async function createTestBookingWrapper({ 
  check_in=new Date(Date.now() - 24 * 60 * 60 * 1000), 
  check_out=new Date(), 
  status='cancelled',
  isDeleted=false
}={}) {
  const testRoom = await createTestRoom()
  const testUser = await createTestUser()
  const booking = await createTestBooking({
    userId: testUser.id,
    roomId: testRoom.id,
    checkInDate: check_in,
    checkOutDate: check_out,
    status: status,
    isDeleted: isDeleted
  })

  return booking
}
