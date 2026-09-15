import { beforeEach, describe, expect, it, vi } from 'vitest'
import BookingsController from '../../src/app/controllers/bookings.controller.js'
import PaymentsController from '../../src/app/controllers/payments.controller.js'
import RoomsController from '../../src/app/controllers/rooms.controller.js'
import UsersController from '../../src/app/controllers/users.controller.js'

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  response.status.mockReturnValue(response)
  return response
}

let response
let next

beforeEach(() => {
  response = createResponse()
  next = vi.fn()
})

describe('UsersController [current user]', () => {
  it('reads the profile identity from the verified token', async () => {
    const user = { id: 42, email: 'user@example.com' }
    const userService = { getUserById: vi.fn().mockResolvedValue(user) }
    const controller = new UsersController({ userService })

    await controller.getCurrentUser({ user: { id: 42 } }, response, next)

    expect(userService.getUserById).toHaveBeenCalledExactlyOnceWith(42)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith({ data: user })
  })

  it('updates the verified user with validated input', async () => {
    const input = { fullname: 'New Name' }
    const user = { id: 42, ...input }
    const userService = { updateUser: vi.fn().mockResolvedValue(user) }
    const controller = new UsersController({ userService })

    await controller.updateCurrentUser({
      user: { id: 42 },
      validated: { body: input }
    }, response, next)

    expect(userService.updateUser).toHaveBeenCalledExactlyOnceWith(42, input)
    expect(response.json).toHaveBeenCalledWith({ data: user })
  })
})

describe('RoomsController [availability]', () => {
  it('returns a stable data and pagination envelope', async () => {
    const result = { items: [{ id: 3 }], total: 12, page: 2, limit: 10 }
    const roomService = { listAvailableRooms: vi.fn().mockResolvedValue(result) }
    const controller = new RoomsController({ roomService })
    const query = { page: 2, limit: 10, capacity: 2 }

    await controller.listAvailableRooms({
      validated: { query }
    }, response, next)

    expect(roomService.listAvailableRooms).toHaveBeenCalledExactlyOnceWith(query)
    expect(response.json).toHaveBeenCalledWith({
      data: result.items,
      meta: { total: 12, page: 2, limit: 10 }
    })
  })
})

describe('BookingsController [current user]', () => {
  let bookingService
  let controller

  beforeEach(() => {
    bookingService = {
      listUserBookings: vi.fn(),
      getUserBookingById: vi.fn(),
      cancelUserBooking: vi.fn()
    }
    controller = new BookingsController({ bookingService })
  })

  it('lists current user bookings with pagination metadata', async () => {
    bookingService.listUserBookings.mockResolvedValue({
      items: [{ id: 8 }], total: 1, page: 1, limit: 20
    })

    await controller.listCurrentUserBookings({
      user: { id: 42 },
      validated: { query: { page: 1, limit: 20 } }
    }, response, next)

    expect(bookingService.listUserBookings).toHaveBeenCalledWith(
      42,
      { page: 1, limit: 20 }
    )
    expect(response.json).toHaveBeenCalledWith({
      data: [{ id: 8 }],
      meta: { total: 1, page: 1, limit: 20 }
    })
  })

  it('gets and cancels bookings using the verified user id', async () => {
    bookingService.getUserBookingById.mockResolvedValue({ id: 8 })
    bookingService.cancelUserBooking.mockResolvedValue(true)
    const request = {
      user: { id: 42 },
      validated: { params: { bookingId: 8 } }
    }

    await controller.getCurrentUserBooking(request, response, next)
    await controller.cancelCurrentUserBooking(request, response, next)

    expect(bookingService.getUserBookingById).toHaveBeenCalledWith(42, 8)
    expect(bookingService.cancelUserBooking).toHaveBeenCalledWith(42, 8)
    expect(response.send).toHaveBeenCalled()
  })
})

describe('PaymentsController [current user]', () => {
  let paymentService
  let controller

  beforeEach(() => {
    paymentService = {
      listUserPayments: vi.fn(),
      getUserPaymentById: vi.fn(),
      createUserPayment: vi.fn()
    }
    controller = new PaymentsController({ paymentService })
  })

  it('lists current user payments with pagination metadata', async () => {
    paymentService.listUserPayments.mockResolvedValue({
      items: [{ id: 5 }], total: 1, page: 1, limit: 20
    })

    await controller.listCurrentUserPayments({
      user: { id: 42 },
      validated: { query: { page: 1, limit: 20 } }
    }, response, next)

    expect(response.json).toHaveBeenCalledWith({
      data: [{ id: 5 }],
      meta: { total: 1, page: 1, limit: 20 }
    })
  })

  it('gets and creates payments using the verified user id', async () => {
    const payment = { id: 5, amount: '240.00' }
    const input = { bookingId: 8, method: 'card', idempotencyKey: 'payment-8' }
    paymentService.getUserPaymentById.mockResolvedValue(payment)
    paymentService.createUserPayment.mockResolvedValue(payment)

    await controller.getCurrentUserPayment({
      user: { id: 42 },
      validated: { params: { paymentId: 5 } }
    }, response, next)
    await controller.createCurrentUserPayment({
      user: { id: 42 },
      validated: { body: input }
    }, response, next)

    expect(paymentService.getUserPaymentById).toHaveBeenCalledWith(42, 5)
    expect(paymentService.createUserPayment).toHaveBeenCalledWith(42, input)
    expect(response.status).toHaveBeenCalledWith(201)
  })
})
