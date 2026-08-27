import { describe, expect } from 'vitest'
import { it as baseIt } from 'vitest'
import { query } from '../../src/database/index.js'
import {
  cleanBeforeEachAndAfterAll,
  createTestBookingWrapper,
  createTestRoom,
  createTestUser
} from './testHelper.js'
import { expectRepositoryError } from './repositoryTestAssertions.js'
import BookingRepository, {
  mapRowToBooking
} from '../../src/app/repositories/bookings.repository.js'

const it = baseIt.extend('bookingRepository', () => {
  return new BookingRepository(query)
})

await cleanBeforeEachAndAfterAll()

function createValidBookingInfo({ userId, roomId, overrides = {} }) {
  return {
    userId,
    roomId,
    checkInDate: '2030-01-10',
    checkOutDate: '2030-01-12',
    status: 'pending',
    ...overrides
  }
}

describe('BookingRepository [findById]', () => {
  it('returns booking object when given booking id', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper({
      check_in: '2030-01-10',
      check_out: '2030-01-12',
      status: 'pending'
    })

    // Act
    const booking = await bookingRepository.findById(testBooking.id)

    // Assert
    expect(booking).toMatchObject(testBooking)
  })

  it('returns null when booking does not exist', async ({ bookingRepository }) => {
    // Arrange
    const nonExistentId = 999999

    // Act
    const booking = await bookingRepository.findById(nonExistentId)

    // Assert
    expect(booking).toBeNull()
  })

  it('returns null when booking is soft deleted', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper({ isDeleted: true })

    // Act
    const booking = await bookingRepository.findById(testBooking.id)

    // Assert
    expect(booking).toBeNull()
  })

  it('rejects with a data access error when database query fails', async () => {
    // Arrange
    const failingQuery = async () => {
      throw new Error('Database unavailable')
    }
    const bookingRepository = new BookingRepository(failingQuery)

    // Act
    const bookingPromise = bookingRepository.findById(1)

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'DATA_ACCESS_ERROR'
    })
  })
})

describe('BookingRepository [createBooking]', () => {
  it('returns booking object and inserts it into database', async ({ bookingRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const testRoom = await createTestRoom()
    const bookingInfo = createValidBookingInfo({
      userId: testUser.id,
      roomId: testRoom.id
    })

    // Act
    const booking = await bookingRepository.createBooking(bookingInfo)

    // Assert
    expect(booking).toMatchObject(bookingInfo)
    const rowResult = await query(
      `SELECT * FROM bookings WHERE id=$1`,
      [booking.id]
    )
    expect(mapRowToBooking(rowResult.rows[0])).toMatchObject(bookingInfo)
  })

  it('uses pending status when status is omitted', async ({ bookingRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const testRoom = await createTestRoom()
    const bookingInfo = createValidBookingInfo({
      userId: testUser.id,
      roomId: testRoom.id
    })
    delete bookingInfo.status

    // Act
    const booking = await bookingRepository.createBooking(bookingInfo)

    // Assert
    expect(booking.status).toBe('pending')
  })

  const requiredFieldCases = [
    { missingField: 'userId', column: 'user_id' },
    { missingField: 'roomId', column: 'room_id' },
    { missingField: 'checkInDate', column: 'check_in' },
    { missingField: 'checkOutDate', column: 'check_out' }
  ]

  it.for(requiredFieldCases)(
    'rejects with a not-null constraint error when $missingField is missing',
    async ({ missingField, column }, { bookingRepository }) => {
      // Arrange
      const testUser = await createTestUser()
      const testRoom = await createTestRoom()
      const bookingInfo = createValidBookingInfo({
        userId: testUser.id,
        roomId: testRoom.id
      })
      delete bookingInfo[missingField]

      // Act
      const bookingPromise = bookingRepository.createBooking(bookingInfo)

      // Assert
      await expectRepositoryError(bookingPromise, {
        code: 'NOT_NULL_CONSTRAINT',
        column
      })
    }
  )

  it('rejects with a check constraint error when check-out is not after check-in', async ({ bookingRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const testRoom = await createTestRoom()
    const bookingInfo = createValidBookingInfo({
      userId: testUser.id,
      roomId: testRoom.id,
      overrides: { checkOutDate: '2030-01-09' }
    })

    // Act
    const bookingPromise = bookingRepository.createBooking(bookingInfo)

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'CHECK_CONSTRAINT',
      constraint: 'bookings_valid_date'
    })
    const rowResult = await query(`SELECT id FROM bookings`)
    expect(rowResult.rows).toEqual([])
  })

  it('rejects with a check constraint error when status is invalid', async ({ bookingRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const testRoom = await createTestRoom()
    const bookingInfo = createValidBookingInfo({
      userId: testUser.id,
      roomId: testRoom.id,
      overrides: { status: 'invalid-status' }
    })

    // Act
    const bookingPromise = bookingRepository.createBooking(bookingInfo)

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'CHECK_CONSTRAINT',
      constraint: 'bookings_valid_state'
    })
  })

  it('rejects with a foreign-key constraint error when user does not exist', async ({ bookingRepository }) => {
    // Arrange
    const testRoom = await createTestRoom()
    const bookingInfo = createValidBookingInfo({
      userId: 999999,
      roomId: testRoom.id
    })

    // Act
    const bookingPromise = bookingRepository.createBooking(bookingInfo)

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'FOREIGN_KEY_CONSTRAINT',
      constraint: 'bookings_user_fk'
    })
  })

  it('rejects with a foreign-key constraint error when room does not exist', async ({ bookingRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const bookingInfo = createValidBookingInfo({
      userId: testUser.id,
      roomId: 999999
    })

    // Act
    const bookingPromise = bookingRepository.createBooking(bookingInfo)

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'FOREIGN_KEY_CONSTRAINT',
      constraint: 'bookings_room_fk'
    })
  })

  describe('overlapping bookings', () => {
    it('rejects overlapping active bookings for the same room', async ({ bookingRepository }) => {
      // Arrange
      const firstUser = await createTestUser({
        email: 'first-overlap-user@example.com',
        username: 'first-overlap-user'
      })
      const secondUser = await createTestUser({
        email: 'second-overlap-user@example.com',
        username: 'second-overlap-user'
      })
      const testRoom = await createTestRoom()

      await bookingRepository.createBooking(createValidBookingInfo({
        userId: firstUser.id,
        roomId: testRoom.id,
        overrides: {
          checkInDate: '2030-01-10',
          checkOutDate: '2030-01-12',
          status: 'confirmed'
        }
      }))

      const overlappingBooking = createValidBookingInfo({
        userId: secondUser.id,
        roomId: testRoom.id,
        overrides: {
          checkInDate: '2030-01-11',
          checkOutDate: '2030-01-13',
          status: 'pending'
        }
      })

      // Act
      const bookingPromise = bookingRepository.createBooking(overlappingBooking)

      // Assert
      await expectRepositoryError(bookingPromise, {
        code: 'EXCLUSION_CONSTRAINT',
        constraint: 'bookings_no_overlapping_active_reservations'
      })
      const rowResult = await query(
        `SELECT id FROM bookings WHERE room_id=$1`,
        [testRoom.id]
      )
      expect(rowResult.rows).toHaveLength(1)
    })

    it('allows bookings with the same dates for different rooms', async ({ bookingRepository }) => {
      // Arrange
      const testUser = await createTestUser()
      const firstRoom = await createTestRoom()
      const secondRoom = await createTestRoom()

      await bookingRepository.createBooking(createValidBookingInfo({
        userId: testUser.id,
        roomId: firstRoom.id
      }))
      const secondBookingInfo = createValidBookingInfo({
        userId: testUser.id,
        roomId: secondRoom.id
      })

      // Act
      const secondBooking = await bookingRepository.createBooking(secondBookingInfo)

      // Assert
      expect(secondBooking).toMatchObject(secondBookingInfo)
    })

    it('allows adjacent bookings for the same room', async ({ bookingRepository }) => {
      // Arrange
      const testUser = await createTestUser()
      const testRoom = await createTestRoom()

      await bookingRepository.createBooking(createValidBookingInfo({
        userId: testUser.id,
        roomId: testRoom.id,
        overrides: {
          checkInDate: '2030-01-10',
          checkOutDate: '2030-01-12'
        }
      }))
      const adjacentBookingInfo = createValidBookingInfo({
        userId: testUser.id,
        roomId: testRoom.id,
        overrides: {
          checkInDate: '2030-01-12',
          checkOutDate: '2030-01-14'
        }
      })

      // Act
      const adjacentBooking = await bookingRepository.createBooking(adjacentBookingInfo)

      // Assert
      expect(adjacentBooking).toMatchObject(adjacentBookingInfo)
    })

    it('allows a new booking when the overlapping booking is cancelled', async ({ bookingRepository }) => {
      // Arrange
      const testUser = await createTestUser()
      const testRoom = await createTestRoom()

      await bookingRepository.createBooking(createValidBookingInfo({
        userId: testUser.id,
        roomId: testRoom.id,
        overrides: { status: 'cancelled' }
      }))
      const activeBookingInfo = createValidBookingInfo({
        userId: testUser.id,
        roomId: testRoom.id,
        overrides: { status: 'pending' }
      })

      // Act
      const activeBooking = await bookingRepository.createBooking(activeBookingInfo)

      // Assert
      expect(activeBooking).toMatchObject(activeBookingInfo)
    })
  })
})

describe('BookingRepository [updateBooking]', () => {
  it('returns mapped booking and updates database fields', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper({
      check_in: '2030-01-10',
      check_out: '2030-01-12',
      status: 'pending'
    })
    const updateInfo = {
      checkOutDate: '2030-01-15',
      status: 'confirmed'
    }

    // Act
    const booking = await bookingRepository.updateBooking(testBooking.id, updateInfo)

    // Assert
    expect(booking).toMatchObject(updateInfo)
    const rowResult = await query(
      `SELECT check_out, status FROM bookings WHERE id=$1`,
      [testBooking.id]
    )
    expect(rowResult.rows[0]).toMatchObject({
      check_out: updateInfo.checkOutDate,
      status: updateInfo.status
    })
  })

  it('returns null when booking does not exist', async ({ bookingRepository }) => {
    // Arrange
    const nonExistentId = 999999
    const updateInfo = {
      status: 'confirmed'
    }

    // Act
    const booking = await bookingRepository.updateBooking(nonExistentId, updateInfo)

    // Assert
    expect(booking).toBeNull()
  })

  it('returns null when booking is soft deleted', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper({ isDeleted: true })
    const updateInfo = { status: 'confirmed' }

    // Act
    const booking = await bookingRepository.updateBooking(testBooking.id, updateInfo)

    // Assert
    expect(booking).toBeNull()
  })

  it('rejects when no updatable fields are provided', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const invalidUpdateInfo = {
      userId: 1,
      roomId: 1
    }

    // Act
    const bookingPromise = bookingRepository.updateBooking(
      testBooking.id,
      invalidUpdateInfo
    )

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'NO_UPDATABLE_FIELDS'
    })
  })

  it('rejects an invalid date update and keeps existing dates', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper({
      check_in: '2030-01-10',
      check_out: '2030-01-12',
      status: 'pending'
    })
    const invalidUpdateInfo = { checkOutDate: '2030-01-09' }

    // Act
    const bookingPromise = bookingRepository.updateBooking(
      testBooking.id,
      invalidUpdateInfo
    )

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'CHECK_CONSTRAINT',
      constraint: 'bookings_valid_date'
    })
    const rowResult = await query(
      `SELECT check_in, check_out FROM bookings WHERE id=$1`,
      [testBooking.id]
    )
    expect(rowResult.rows[0]).toMatchObject({
      check_in: '2030-01-10',
      check_out: '2030-01-12'
    })
  })

  it('rejects an invalid status update', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const invalidUpdateInfo = { status: 'completed' }

    // Act
    const bookingPromise = bookingRepository.updateBooking(
      testBooking.id,
      invalidUpdateInfo
    )

    // Assert
    await expectRepositoryError(bookingPromise, {
      code: 'CHECK_CONSTRAINT',
      constraint: 'bookings_valid_state'
    })
  })
})

describe('BookingRepository [deleteById]', () => {
  it('returns true and soft deletes booking', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()

    // Act
    const isDeleted = await bookingRepository.deleteById(testBooking.id)

    // Assert
    expect(isDeleted).toBe(true)
    const rowResult = await query(
      `SELECT is_deleted FROM bookings WHERE id=$1`,
      [testBooking.id]
    )
    expect(rowResult.rows[0].is_deleted).toBe(true)
  })

  it('returns false when booking is already soft deleted', async ({ bookingRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper({ isDeleted: true })

    // Act
    const isDeleted = await bookingRepository.deleteById(testBooking.id)

    // Assert
    expect(isDeleted).toBe(false)
  })

  it('returns false when booking does not exist', async ({ bookingRepository }) => {
    // Arrange
    const nonExistentId = 999999

    // Act
    const isDeleted = await bookingRepository.deleteById(nonExistentId)

    // Assert
    expect(isDeleted).toBe(false)
  })

  it('rejects with a data access error when database query fails', async () => {
    // Arrange
    const failingQuery = async () => {
      throw new Error('Database unavailable')
    }
    const bookingRepository = new BookingRepository(failingQuery)

    // Act
    const deletePromise = bookingRepository.deleteById(1)

    // Assert
    await expectRepositoryError(deletePromise, {
      code: 'DATA_ACCESS_ERROR'
    })
  })
})
