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

export async function createTestRoom({ name="Room 1", pricePerNight=200, deleted_at=null } = {}) {
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
    id: Number(room.id),
    name: room.name,
    pricePerNight: Number(room.price_per_night),
    created_at: Date(room.created_at),
    deleted_at: Date(room.deleted_at),
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
  status = 'completed'
}) {
  const rowResult = await query(
    `
    INSERT INTO bookings (user_id, room_id, check_in, check_out, status)
    VALUES
    ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [userId, roomId, checkInDate, checkOutDate, status]
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
  status= 'cancelled'
}={}) {
  const testRoom = await createTestRoom()
  const testUser = await createTestUser()
  const booking = await createTestBooking({
    userId: testUser.id,
    roomId: testRoom.id,
    checkInDate: check_in,
    checkOutDate: check_out,
    status: status
  })

  return booking
}
