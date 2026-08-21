import { describe, it, expect, beforeEach, afterAll, test } from 'vitest'
import { query } from '../../src/database/index.js'
import { mapRowToBooking, BookingRepository } from '../../src/app/repositories/bookings.repositories.js'

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
    id: Number(room.id),
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
    id: Number(user.id),
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
async function createTestBookingWrapper({ 
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

function addDay(date, days) {
  return new Date(date + days * 24 * 60 * 60 * 1000)
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

  it('returns null when given non-existent id', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query) 
    const nonExistId = 1000

    // Act
    const booking = await bookingRepository.getById(nonExistId)

    // Assert
    expect(booking).toBeNull()
  })
})

describe('BookingRepository [createBooking]', () => {
  it('returns new booking object and stores new booking in database', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query)
    const testRoom = await createTestRoom()
    const testUser = await createTestUser()
    const bookingInfo = {
      userId: testUser.id,
      roomId: testRoom.id,
      checkInDate: addDay(Date.now(), 1).toISOString().split('T')[0],
      checkOutDate: addDay(Date.now(), 3).toISOString().split('T')[0],
      status: 'pending'
    }

    // Act
    const booking = await bookingRepository.createBooking(bookingInfo)

    // Assert
    expect(booking).toMatchObject(bookingInfo)
    // Assert side effect
    const rowResult = await query(`SELECT * FROM bookings where id=$1`, [booking.id])
    expect (mapRowToBooking(rowResult.rows[0])).toMatchObject(bookingInfo)
  })

  it('throws AppError and does not insert into database when given checkOutDate earlier than checkInDate', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query)
    const testUser = await createTestUser()
    const testRoom = await createTestRoom()
    const bookingInfo = {
      userId: testUser.id,
      roomId: testRoom.id,
      checkInDate: new Date(),
      checkOutDate: addDay(Date.now(), -1),
      status: 'pending'
    }

    // Act
    const booking = bookingRepository.createBooking(bookingInfo)

    // Assert
    await expect(booking).rejects.toMatchObject({
      statusCode: 400,
      message:`Check out date can't be earlier than check in date`
    })
    // Assert side effect
    const checkInQuery = bookingInfo.checkInDate.toISOString().split('T')[0]
    const checkOutQuery = bookingInfo.checkOutDate.toISOString().split('T')[0]
    const rowResult = await query(`SELECT id FROM bookings WHERE check_in=$1 AND check_out=$2`,
       [checkInQuery, checkOutQuery])
    expect(rowResult.rows.length).toBe(0)
  })

  it('throws AppError when given non-existent userId', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query)
    const testRoom = await createTestRoom()
    const bookingInfoNonExistUserId = {
      userId: 1, 
      roomId: testRoom.id, 
      checkInDate: new Date(), 
      checkOutDate: addDay(Date.now(), 1),
      status: 'pending'
    }

    // Act
    const bookingNonExistUserId = bookingRepository.createBooking(bookingInfoNonExistUserId)

    // Assert
    await expect(bookingNonExistUserId).rejects.toMatchObject({
      statusCode: 400,
      message: 'User does not exist'
    })
  })

  it('throws AppError when given non-existent roomId', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query)
    const testUser = await createTestUser()
    const bookingInfoNonExistRoomId = { 
      userId: testUser.id, 
      roomId: 1, 
      checkInDate: new Date(), 
      checkOutDate: addDay(Date.now(), 1),
      status: 'pending' 
    }

    // Act
    const bookingNonExistRoomId = bookingRepository.createBooking(bookingInfoNonExistRoomId)

    // Assert
    await expect(bookingNonExistRoomId).rejects.toMatchObject({
      statusCode: 400,
      message: 'Room does not exist'
    })
  })
})

describe('BookingRepository [deleteById]', () => {
  it('returns true and update is_deleted to true when given id', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query)
    const testBooking = await createTestBookingWrapper()

    // Act
    const is_deleted = await bookingRepository.deleteById(testBooking.id)

    // Assert
    expect(is_deleted).toBe(true)
    // Assert side effect
    const rowResult = await query(`SELECT id, is_deleted FROM bookings WHERE id=$1`, [testBooking.id])
    const bookingInDb = rowResult.rows[0]
    expect(bookingInDb.is_deleted).toBe(true)
  })

  it('returns false when given id of deleted booking', async () => {
    // Arrange
    const bookingRepository = new BookingRepository(query)
    const testBooking = await createTestBookingWrapper()
    await bookingRepository.deleteById(testBooking.id)

    // Act
    const is_deleted = bookingRepository.deleteById(testBooking.id)

    // Assert
    expect(is_deleted).toBe(false)
  })
})
