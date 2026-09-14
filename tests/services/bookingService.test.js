import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import BookingService from '../../src/app/services/bookings.service.js'
import { expectAppError } from './serviceTestAssertions.js'

// TDD contract: implement bookings.service.js with
// constructor({ bookingRepository }) and the public methods below.
const booking = {
  id: 1,
  userId: 2,
  roomId: 3,
  checkInDate: '2030-01-10',
  checkOutDate: '2030-01-12',
  status: 'pending'
}

let bookingRepository
let bookingService
let bookingInfo

beforeEach(() => {
  bookingRepository = {
    findById: vi.fn(),
    createBooking: vi.fn(),
    updateBooking: vi.fn(),
    deleteById: vi.fn()
  }
  bookingInfo = {
    userId: booking.userId,
    roomId: booking.roomId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    status: booking.status
  }
  bookingService = new BookingService({ bookingRepository })
})

describe('BookingService [getBookingById]', () => {
  it.each(['pending', 'confirmed', 'cancelled'])(
    'returns an existing booking with status %s',
    async status => {
      // Arrange
      const existingBooking = { ...booking, status }
      bookingRepository.findById.mockResolvedValue(existingBooking)

      // Act
      const result = await bookingService.getBookingById(existingBooking.id)

      // Assert
      expect(result).toEqual(existingBooking)
      expect(bookingRepository.findById).toHaveBeenCalledExactlyOnceWith(
        existingBooking.id
      )
    }
  )

  it('rejects when the booking is missing or soft deleted', async () => {
    // The repository returns null for both cases.
    bookingRepository.findById.mockResolvedValue(null)

    await expectAppError(bookingService.getBookingById(999999), {
      code: 'BOOKING_NOT_FOUND',
      message: 'Booking does not exist'
    })
  })
})

describe('BookingService [createBooking]', () => {
  it('creates and returns a booking', async () => {
    // Arrange
    bookingRepository.createBooking.mockResolvedValue(booking)

    // Act
    const result = await bookingService.createBooking(bookingInfo)

    // Assert
    expect(result).toEqual(booking)
    expect(bookingRepository.createBooking).toHaveBeenCalledExactlyOnceWith(
      bookingInfo
    )
  })

  it('allows status to be omitted so the repository default applies', async () => {
    // Arrange
    delete bookingInfo.status
    bookingRepository.createBooking.mockResolvedValue(booking)

    // Act
    const result = await bookingService.createBooking(bookingInfo)

    // Assert
    expect(result).toEqual(booking)
    expect(bookingRepository.createBooking).toHaveBeenCalledExactlyOnceWith(
      bookingInfo
    )
  })
})

describe('BookingService [updateBooking]', () => {
  it('updates only dates and status without changing the input', async () => {
    // Arrange
    const updateInfo = Object.freeze({
      checkInDate: '2030-01-11',
      checkOutDate: '2030-01-14',
      status: 'confirmed',
      userId: 99,
      roomId: 99,
      id: 99,
      unknownField: 'ignored'
    })
    const expectedUpdate = {
      checkInDate: updateInfo.checkInDate,
      checkOutDate: updateInfo.checkOutDate,
      status: updateInfo.status
    }
    const updatedBooking = { ...booking, ...expectedUpdate }
    bookingRepository.updateBooking.mockResolvedValue(updatedBooking)

    // Act
    const result = await bookingService.updateBooking(booking.id, updateInfo)

    // Assert
    expect(result).toEqual(updatedBooking)
    expect(bookingRepository.updateBooking).toHaveBeenCalledExactlyOnceWith(
      booking.id,
      expectedUpdate
    )
  })

  it('omits undefined fields', async () => {
    // Arrange
    const expectedUpdate = { status: 'cancelled' }
    const updatedBooking = { ...booking, ...expectedUpdate }
    bookingRepository.updateBooking.mockResolvedValue(updatedBooking)

    // Act
    const result = await bookingService.updateBooking(booking.id, {
      checkInDate: undefined,
      checkOutDate: undefined,
      status: 'cancelled'
    })

    // Assert
    expect(result).toEqual(updatedBooking)
    expect(bookingRepository.updateBooking).toHaveBeenCalledExactlyOnceWith(
      booking.id,
      expectedUpdate
    )
  })

  it.each([
    { label: 'an empty object', updateInfo: {} },
    { label: 'null', updateInfo: null },
    { label: 'undefined', updateInfo: undefined },
    {
      label: 'protected or unknown fields',
      updateInfo: { userId: 4, roomId: 5, id: 6, unknownField: 'ignored' }
    },
    {
      label: 'only undefined values',
      updateInfo: {
        checkInDate: undefined,
        checkOutDate: undefined,
        status: undefined
      }
    }
  ])('rejects $label without calling the repository', async ({ updateInfo }) => {
    await expectAppError(
      bookingService.updateBooking(booking.id, updateInfo),
      {
        code: 'NO_BOOKING_FIELDS_TO_UPDATE',
        message: 'No booking fields can be updated'
      }
    )
    expect(bookingRepository.updateBooking).not.toHaveBeenCalled()
  })

  it('rejects when the booking is missing or soft deleted', async () => {
    bookingRepository.updateBooking.mockResolvedValue(null)

    await expectAppError(
      bookingService.updateBooking(999999, { status: 'confirmed' }),
      {
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking does not exist'
      }
    )
  })

  it('maps a repository NO_UPDATABLE_FIELDS error', async () => {
    bookingRepository.updateBooking.mockRejectedValue(
      new RepositoryError('NO_UPDATABLE_FIELDS')
    )

    await expectAppError(
      bookingService.updateBooking(booking.id, { status: 'confirmed' }),
      {
        code: 'NO_BOOKING_FIELDS_TO_UPDATE',
        message: 'No booking fields can be updated'
      }
    )
  })
})

describe('BookingService [deactivateBooking]', () => {
  it('returns true when the booking is soft deleted', async () => {
    // Arrange
    bookingRepository.deleteById.mockResolvedValue(true)

    // Act
    const deactivated = await bookingService.deactivateBooking(booking.id)

    // Assert
    expect(deactivated).toBe(true)
    expect(bookingRepository.deleteById).toHaveBeenCalledExactlyOnceWith(
      booking.id
    )
  })

  it('returns false when the booking is already deleted or does not exist', async () => {
    // Arrange
    bookingRepository.deleteById.mockResolvedValue(false)

    // Act
    const deactivated = await bookingService.deactivateBooking(999999)

    // Assert
    expect(deactivated).toBe(false)
    expect(bookingRepository.deleteById).toHaveBeenCalledExactlyOnceWith(999999)
  })
})

describe.each(['createBooking', 'updateBooking'])(
  'BookingService [%s constraint errors]',
  method => {
    it.each([
      {
        label: 'a missing user',
        repositoryCode: 'FOREIGN_KEY_CONSTRAINT',
        details: { constraint: 'bookings_user_fk' },
        expected: { code: 'USER_NOT_FOUND', message: 'User does not exist' }
      },
      {
        label: 'a missing room',
        repositoryCode: 'FOREIGN_KEY_CONSTRAINT',
        details: { constraint: 'bookings_room_fk' },
        expected: { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' }
      },
      {
        label: 'a null required field',
        repositoryCode: 'NOT_NULL_CONSTRAINT',
        details: { column: 'check_in' },
        expected: {
          code: 'INVALID_BOOKING_DATA',
          message: 'Booking data is invalid'
        }
      },
      {
        label: 'invalid dates',
        repositoryCode: 'CHECK_CONSTRAINT',
        details: { constraint: 'bookings_valid_date' },
        expected: {
          code: 'INVALID_BOOKING_DATA',
          message: 'Booking data is invalid'
        }
      },
      {
        label: 'an invalid status',
        repositoryCode: 'CHECK_CONSTRAINT',
        details: { constraint: 'bookings_valid_state' },
        expected: {
          code: 'INVALID_BOOKING_DATA',
          message: 'Booking data is invalid'
        }
      },
      {
        label: 'overlapping active dates',
        repositoryCode: 'EXCLUSION_CONSTRAINT',
        details: {
          constraint: 'bookings_no_overlapping_active_reservations'
        },
        expected: {
          code: 'BOOKING_DATES_OVERLAP',
          message: 'Booking dates overlap with an active booking'
        }
      },
      {
        label: 'an unrelated foreign key constraint',
        repositoryCode: 'FOREIGN_KEY_CONSTRAINT',
        details: { constraint: 'unrelated_foreign_key' },
        expected: { code: 'INTERNAL_ERROR', message: 'Internal error' }
      },
      {
        label: 'an unrelated exclusion constraint',
        repositoryCode: 'EXCLUSION_CONSTRAINT',
        details: { constraint: 'unrelated_exclusion_constraint' },
        expected: { code: 'INTERNAL_ERROR', message: 'Internal error' }
      }
    ])('maps $label to an AppError', async ({ repositoryCode, details, expected }) => {
      // Arrange
      bookingRepository[method].mockRejectedValue(
        new RepositoryError(repositoryCode, details)
      )

      // Act
      const bookingPromise = method === 'createBooking'
        ? bookingService.createBooking(bookingInfo)
        : bookingService.updateBooking(booking.id, { status: 'confirmed' })

      // Assert
      await expectAppError(bookingPromise, expected)
    })
  }
)

describe.each([
  {
    serviceMethod: 'getBookingById',
    repositoryMethod: 'findById',
    args: () => [booking.id]
  },
  {
    serviceMethod: 'createBooking',
    repositoryMethod: 'createBooking',
    args: () => [bookingInfo]
  },
  {
    serviceMethod: 'updateBooking',
    repositoryMethod: 'updateBooking',
    args: () => [booking.id, { status: 'confirmed' }]
  },
  {
    serviceMethod: 'deactivateBooking',
    repositoryMethod: 'deleteById',
    args: () => [booking.id]
  }
])(
  'BookingService [$serviceMethod error handling]',
  ({ serviceMethod, repositoryMethod, args }) => {
    it.each(['DATA_ACCESS_ERROR', 'UNKNOWN_REPOSITORY_ERROR'])(
      'does not expose repository error %s',
      async code => {
        // Arrange
        bookingRepository[repositoryMethod].mockRejectedValue(
          new RepositoryError(code, {
            cause: new Error('Private database details')
          })
        )

        // Act
        const bookingPromise = bookingService[serviceMethod](...args())

        // Assert
        await expectAppError(bookingPromise, {
          code: 'INTERNAL_ERROR',
          message: 'Internal error'
        })
      }
    )

    it('preserves an existing AppError', async () => {
      // Arrange
      const error = new AppError(
        'Booking operation unavailable',
        'BOOKING_OPERATION_UNAVAILABLE'
      )
      bookingRepository[repositoryMethod].mockRejectedValue(error)

      // Act and assert
      await expect(bookingService[serviceMethod](...args())).rejects.toBe(error)
    })

    it('rethrows an unexpected error unchanged', async () => {
      // Arrange
      const error = new TypeError('Unexpected service dependency failure')
      bookingRepository[repositoryMethod].mockRejectedValue(error)

      // Act and assert
      await expect(bookingService[serviceMethod](...args())).rejects.toBe(error)
    })
  }
)
