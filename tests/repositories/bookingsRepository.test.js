import { describe, expect } from 'vitest'
import { it as baseIt } from 'vitest'
import { query } from '../../src/database/index.js'
import { 
  cleanBeforeEachAndAfterAll, 
  createTestBookingWrapper, 
  createTestRoom,
  createTestUser 
} from './testHelper.js'
import BookingRepository from '../../src/app/repositories/bookings.repository.js'
import { mapRowToBooking } from '../../src/app/repositories/bookings.repository.js'

const it = baseIt.extend('bookingRepository', () => {
  return new BookingRepository(query)
})

await cleanBeforeEachAndAfterAll()

function addDay(date, days) {
  return new Date(date + days * 24 * 60 * 60 * 1000)
}

describe('BookingRepository [getById]', () => {
  it('returns booking object when given booking id', async({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()

    // Act
    const booking = await bookingRepository.getById(testBooking.id)

    // Assert
    expect(booking).toMatchObject(testBooking)
  })

  it('returns null when given non-existent id', async({ bookingRepository }) => {
    // Arrange
    const nonExistId = 1000

    // Act
    const booking = await bookingRepository.getById(nonExistId)

    // Assert
    expect(booking).toBeNull()
  })
})

describe('BookingRepository [createBooking]', () => {
  it('returns new booking object and stores new booking in database', async({ bookingRepository }) => {
    // Arrange
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

  it('throws AppError and does not insert into database when given checkOutDate earlier than checkInDate', async({ bookingRepository }) => {
    // Arrange
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

  it('throws AppError when given non-existent userId', async({ bookingRepository }) => {
    // Arrange
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

  it('throws AppError when given non-existent roomId', async({ bookingRepository }) => {
    // Arrange
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
  it('returns true and update deleted_at to time it\'s deleted when given id', async({ bookingRepository }) => {
    // Arrange
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

  it('returns false when given id of deleted booking', async({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    await bookingRepository.deleteById(testBooking.id)

    // Act
    const is_deleted = await bookingRepository.deleteById(testBooking.id)

    // Assert
    expect(is_deleted).toBe(false)
  })

  describe('BookingRepository [updateBooking]', () => {
    it('returns new booking and updates booking in database', async({ bookingRepository }) => {
      // Arrange
        const testBooking = await createTestBookingWrapper()

      const updateInfo = {
        check_out: addDay(Date.now(), 10).toISOString().split('T')[0],
        status: 'confirmed'
      }

      // Act
      const booking = await bookingRepository.updateBooking(testBooking.id, updateInfo)

      // Assert
      expect(booking).toMatchObject(updateInfo)
      // Assert side effect
      const rowResult = await query(`SELECT * FROM bookings WHERE id=$1`, [testBooking.id])
      const bookingInDb = rowResult.rows[0]
      expect(bookingInDb.status).toBe(updateInfo.status)
      expect(bookingInDb.checkOutDate).toBe(updateInfo.checkOutDate)
    })

    it('returns null when given non-existent id', async({ bookingRepository }) => {
      // Arrange
        const nonExistId = 1000
      const updateInfo = {
        check_out: addDay(Date.now(), 10).toISOString().split('T')[0],
        status: 'completed'
      }
      // Act
      const booking = await bookingRepository.updateBooking(nonExistId, updateInfo)

      // Assert
      expect(booking).toBeNull()
    })
  })
})
