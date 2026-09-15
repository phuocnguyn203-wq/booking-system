import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import BookingsController from '../../src/app/controllers/bookings.controller.js'

const booking = {
  id: 1,
  userId: 2,
  roomId: 3,
  checkInDate: '2030-01-10',
  checkOutDate: '2030-01-12',
  status: 'pending'
}

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  res.status.mockReturnValue(res)
  return res
}

let bookingService
let bookingsController
let res
let next

beforeEach(() => {
  bookingService = {
    getBookingById: vi.fn(),
    createBooking: vi.fn(),
    updateBooking: vi.fn(),
    deactivateBooking: vi.fn()
  }
  bookingsController = new BookingsController({ bookingService })
  res = createResponse()
  next = vi.fn()
})

describe('BookingsController [getBookingById]', () => {
  it('returns an existing booking with status 200', async () => {
    // Arrange
    const req = { params: { bookingId: String(booking.id) } }
    bookingService.getBookingById.mockResolvedValue(booking)

    // Act
    await bookingsController.getBookingById(req, res, next)

    // Assert
    expect(bookingService.getBookingById).toHaveBeenCalledExactlyOnceWith(
      booking.id
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: booking })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('BookingsController [createBooking]', () => {
  it('creates a booking and returns it with status 201', async () => {
    // Arrange
    const bookingInfo = {
      userId: booking.userId,
      roomId: booking.roomId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate
    }
    const req = { body: bookingInfo }
    bookingService.createBooking.mockResolvedValue(booking)

    // Act
    await bookingsController.createBooking(req, res, next)

    // Assert
    expect(bookingService.createBooking).toHaveBeenCalledExactlyOnceWith(
      bookingInfo
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(201)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: booking })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('BookingsController [updateBooking]', () => {
  it('updates a booking and returns it with status 200', async () => {
    // Arrange
    const updateInfo = {
      checkOutDate: '2030-01-14',
      status: 'confirmed'
    }
    const updatedBooking = { ...booking, ...updateInfo }
    const req = {
      params: { bookingId: String(booking.id) },
      body: updateInfo
    }
    bookingService.updateBooking.mockResolvedValue(updatedBooking)

    // Act
    await bookingsController.updateBooking(req, res, next)

    // Assert
    expect(bookingService.updateBooking).toHaveBeenCalledExactlyOnceWith(
      booking.id,
      updateInfo
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: updatedBooking })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('BookingsController [deactivateBooking]', () => {
  it.each([true, false])(
    'returns status 204 when the service returns %s',
    async deactivated => {
      // Arrange
      const req = { params: { bookingId: String(booking.id) } }
      bookingService.deactivateBooking.mockResolvedValue(deactivated)

      // Act
      await bookingsController.deactivateBooking(req, res, next)

      // Assert
      expect(bookingService.deactivateBooking).toHaveBeenCalledExactlyOnceWith(
        booking.id
      )
      expect(res.status).toHaveBeenCalledExactlyOnceWith(204)
      expect(res.send).toHaveBeenCalledExactlyOnceWith()
      expect(res.json).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    }
  )
})

describe.each([
  {
    controllerMethod: 'getBookingById',
    serviceMethod: 'getBookingById',
    req: () => ({ params: { bookingId: String(booking.id) } })
  },
  {
    controllerMethod: 'createBooking',
    serviceMethod: 'createBooking',
    req: () => ({
      body: {
        userId: booking.userId,
        roomId: booking.roomId,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate
      }
    })
  },
  {
    controllerMethod: 'updateBooking',
    serviceMethod: 'updateBooking',
    req: () => ({
      params: { bookingId: String(booking.id) },
      body: { status: 'confirmed' }
    })
  },
  {
    controllerMethod: 'deactivateBooking',
    serviceMethod: 'deactivateBooking',
    req: () => ({ params: { bookingId: String(booking.id) } })
  }
])(
  'BookingsController [$controllerMethod error handling]',
  ({ controllerMethod, serviceMethod, req }) => {
    it('forwards service errors to the error middleware', async () => {
      // Arrange
      const error = new AppError('Booking does not exist', 'BOOKING_NOT_FOUND')
      bookingService[serviceMethod].mockRejectedValue(error)

      // Act
      await bookingsController[controllerMethod](req(), res, next)

      // Assert
      expect(next).toHaveBeenCalledExactlyOnceWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })
  }
)
