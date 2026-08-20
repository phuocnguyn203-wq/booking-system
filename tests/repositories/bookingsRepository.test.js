import { describe, it, expect, beforeEach, afterAll, test } from 'vitest'
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

async function createTestRoom({ name="Room 1", pricePerNight=200, deleted_at=null } = {}) {
  let result
  if (deleted_at === 'now'){
    result = await query(
      `
      INSERT INTO rooms (name, price_per_night, deleted_at)
      VALUES
      ($1, $2, NOW())
      RETURNING *;
      `,
      [name, pricePerNight],
    )
  } else {
    result = await query(
      `
      INSERT INTO rooms (name, price_per_night)
      VALUES
      ($1, $2)
      RETURNING *;
      `,
      [name, pricePerNight],
    )
  }

  const room = result.rows[0]
  return {
    id: room.id,
    name: room.name,
    pricePerNight: Number(room.price_per_night),
    created_at: Date(room.created_at),
    deleted_at: Date(room.deleted_at),
  }
}

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

async function createTestBooking({ 
  userId,
  roomId, 
  checkInDate = new Date(Date.now() - 24 * 60 * 60 * 3600), 
  checkOutDate = new Date(Date.now())
}) {
  const rowResult = await query(
    `
    INSERT INTO bookings (user_id, room_id, check_in, check_out)
    VALUES
    ($1, $2, $3, $4)
    RETURNING *
    `,
    [userId, roomId, checkInDate, checkOutDate]
  )

  const booking = rowResult.rows[0]
  return {
    id: parseInt(booking.id, 10),
    user_id: parseInt(booking.user_id, 10),
    room_id: parseInt(booking.room_id, 10),
    check_in: booking.check_in,
    check_out: booking.check_out
  }
}

// booking needs to have user and room so i create both user and room here
async function createTestBookingWrapper() {
  const testRoom = await createTestRoom()
  const testUser = await createTestUser()
  const booking = await createTestBooking({
    userId: testUser.id,
    roomId: testRoom.id
  })

  return booking
}

describe('BookingRepository [getById]', () => {
  it('returns booking object when given booking id', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query)
    const testBooking = await createTestBookingWrapper()

    // Act
    const booking = await bookingRepository.getById(testBooking.id)

    // Assert
    expect(booking).toMatchObject(testBooking)
  })

  it('returns null when given non-exist id', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query) 
    const nonExistId = 1000

    // Act
    const booking = bookingRepository.getById(nonExistId)

    // Assert
    expect(booking).toBeNull()
  })
})