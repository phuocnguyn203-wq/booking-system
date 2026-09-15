import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import BookingService from '../../src/app/services/bookings.service.js'
import PaymentService from '../../src/app/services/payments.service.js'
import RoomService from '../../src/app/services/rooms.service.js'
import { expectAppError } from './serviceTestAssertions.js'

const pagination = { page: 2, limit: 10 }

describe('RoomService [listAvailableRooms]', () => {
  let roomRepository
  let service

  beforeEach(() => {
    roomRepository = { findAvailable: vi.fn() }
    service = new RoomService({ roomRepository })
  })

  it('translates page-based input to a repository offset', async () => {
    const filters = {
      ...pagination,
      checkInDate: '2030-01-10',
      checkOutDate: '2030-01-12',
      capacity: 2
    }
    roomRepository.findAvailable.mockResolvedValue({ total: 1, items: [{ id: 7 }] })

    const result = await service.listAvailableRooms(filters)

    expect(roomRepository.findAvailable).toHaveBeenCalledExactlyOnceWith({
      checkInDate: filters.checkInDate,
      checkOutDate: filters.checkOutDate,
      capacity: 2,
      limit: 10,
      offset: 10
    })
    expect(result).toEqual({ total: 1, items: [{ id: 7 }], page: 2, limit: 10 })
  })

  it('does not expose repository failures', async () => {
    roomRepository.findAvailable.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    await expectAppError(service.listAvailableRooms(pagination), {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('BookingService [customer operations]', () => {
  let bookingRepository
  let service

  beforeEach(() => {
    bookingRepository = {
      findByUserId: vi.fn(),
      findByIdForUser: vi.fn(),
      cancelByIdForUser: vi.fn()
    }
    service = new BookingService({ bookingRepository })
  })

  it('lists only the current user bookings with pagination', async () => {
    bookingRepository.findByUserId.mockResolvedValue({
      total: 12,
      items: [{ id: 12 }]
    })

    const result = await service.listUserBookings(4, pagination)

    expect(bookingRepository.findByUserId).toHaveBeenCalledExactlyOnceWith(4, {
      limit: 10,
      offset: 10
    })
    expect(result).toEqual({ total: 12, items: [{ id: 12 }], page: 2, limit: 10 })
  })

  it('returns an owned booking and hides another user booking as not found', async () => {
    const booking = { id: 8, userId: 4 }
    bookingRepository.findByIdForUser
      .mockResolvedValueOnce(booking)
      .mockResolvedValueOnce(null)

    await expect(service.getUserBookingById(4, 8)).resolves.toEqual(booking)
    await expectAppError(service.getUserBookingById(4, 9), {
      code: 'BOOKING_NOT_FOUND'
    })
  })

  it('returns the cancellation result without revealing ownership', async () => {
    bookingRepository.cancelByIdForUser.mockResolvedValue(false)

    await expect(service.cancelUserBooking(4, 8)).resolves.toBe(false)
    expect(bookingRepository.cancelByIdForUser).toHaveBeenCalledExactlyOnceWith(8, 4)
  })
})

describe('PaymentService [customer operations]', () => {
  let paymentRepository
  let service

  beforeEach(() => {
    paymentRepository = {
      findByUserId: vi.fn(),
      findByIdForUser: vi.fn(),
      createForUser: vi.fn()
    }
    service = new PaymentService({ paymentRepository })
  })

  it('lists only the current user payments with pagination', async () => {
    paymentRepository.findByUserId.mockResolvedValue({ total: 1, items: [{ id: 5 }] })

    const result = await service.listUserPayments(4, pagination)

    expect(paymentRepository.findByUserId).toHaveBeenCalledExactlyOnceWith(4, {
      limit: 10,
      offset: 10
    })
    expect(result).toEqual({ total: 1, items: [{ id: 5 }], page: 2, limit: 10 })
  })

  it('hides a payment not owned by the current user', async () => {
    paymentRepository.findByIdForUser.mockResolvedValue(null)

    await expectAppError(service.getUserPaymentById(4, 5), {
      code: 'PAYMENT_NOT_FOUND'
    })
  })

  it('creates a payment through the ownership-aware repository contract', async () => {
    const input = {
      bookingId: 8,
      method: 'card',
      idempotencyKey: 'payment-8'
    }
    const payment = { id: 5, bookingId: 8, amount: '240.00' }
    paymentRepository.createForUser.mockResolvedValue(payment)

    await expect(service.createUserPayment(4, input)).resolves.toEqual(payment)
    expect(paymentRepository.createForUser).toHaveBeenCalledExactlyOnceWith(4, input)
  })

  it('reports an unavailable or unowned booking without exposing ownership', async () => {
    paymentRepository.createForUser.mockResolvedValue(null)

    await expectAppError(service.createUserPayment(4, { bookingId: 99 }), {
      code: 'BOOKING_NOT_FOUND'
    })
  })

  it('keeps idempotency conflicts stable for customer payment creation', async () => {
    paymentRepository.createForUser.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'payments_idempotency_key_unique'
      })
    )

    await expectAppError(service.createUserPayment(4, { bookingId: 8 }), {
      code: 'PAYMENT_REQUEST_ALREADY_EXISTS'
    })
  })
})
