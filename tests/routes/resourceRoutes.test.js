import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createAuthenticate from '../../src/app/middleware/authenticate.middleware.js'
import createErrorHandler from '../../src/app/middleware/errorHandler.middleware.js'
import createBookingsRouter from '../../src/app/routes/bookings.routes.js'
import createPaymentsRouter from '../../src/app/routes/payments.routes.js'
import createRolesRouter from '../../src/app/routes/roles.routes.js'
import createRoomsRouter from '../../src/app/routes/rooms.routes.js'
import createUserRolesRouter from '../../src/app/routes/userRoles.routes.js'
import createUsersRouter from '../../src/app/routes/users.routes.js'

function createController(methods) {
  return Object.fromEntries(methods.map(method => [
    method,
    vi.fn((req, res) => res.status(200).json({
      data: method,
      validated: req.validated,
      user: req.user
    }))
  ]))
}

function createRouteApp({ mountPath, createRouter, dependency, controller }) {
  const authService = { verifyAccessToken: vi.fn() }
  const authenticate = createAuthenticate({ authService })
  const logger = { error: vi.fn() }
  const router = createRouter({ [dependency]: controller, authenticate })
  const app = express()

  app.use(express.json())
  app.use(mountPath, router)
  app.use(createErrorHandler({ logger }))

  return { app, authService }
}

function authenticatedRequest(app, method, path, body) {
  const pendingRequest = request(app)[method](path)
    .set('Authorization', 'Bearer access-token')

  return body === undefined ? pendingRequest : pendingRequest.send(body)
}

let identity

beforeEach(() => {
  identity = { id: 42, roles: ['ADMIN'] }
})

describe('users routes', () => {
  let controller
  let app
  let authService

  beforeEach(() => {
    controller = createController([
      'getCurrentUser',
      'updateCurrentUser',
      'getUserById',
      'createUser',
      'updateUser',
      'deactivateUser',
      'changePassword'
    ])
    ;({ app, authService } = createRouteApp({
      mountPath: '/users',
      createRouter: createUsersRouter,
      dependency: 'usersController',
      controller
    }))
    authService.verifyAccessToken.mockResolvedValue(identity)
  })

  it('allows public registration with normalized input', async () => {
    const response = await request(app).post('/users').send({
      email: ' USER@EXAMPLE.COM ',
      fullname: ' Test User ',
      username: ' test-user ',
      password: 'StrongPassword123!'
    })

    expect(response.status).toBe(200)
    expect(controller.createUser).toHaveBeenCalledOnce()
    expect(response.body.validated.body).toEqual({
      email: 'user@example.com',
      fullname: 'Test User',
      username: 'test-user',
      password: 'StrongPassword123!'
    })
    expect(authService.verifyAccessToken).not.toHaveBeenCalled()
  })

  it.each([
    { method: 'get', path: '/users/7', handler: 'getUserById' },
    {
      method: 'patch',
      path: '/users/7',
      body: { fullname: 'Updated User' },
      handler: 'updateUser'
    },
    { method: 'delete', path: '/users/7', handler: 'deactivateUser' }
  ])('allows ADMIN to call $method $path', async ({ method, path, body, handler }) => {
    const response = await authenticatedRequest(app, method, path, body)

    expect(response.status).toBe(200)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it('uses the authenticated identity for the password route', async () => {
    identity = { id: 42, roles: ['CUSTOMER'] }
    authService.verifyAccessToken.mockResolvedValue(identity)

    const response = await authenticatedRequest(
      app,
      'patch',
      '/users/me/password',
      {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewPassword123!'
      }
    )

    expect(response.status).toBe(200)
    expect(response.body.user).toEqual(identity)
    expect(controller.changePassword).toHaveBeenCalledOnce()
  })

  it.each([
    { method: 'get', path: '/users/me', handler: 'getCurrentUser' },
    {
      method: 'patch',
      path: '/users/me',
      body: { fullname: 'Updated Customer' },
      handler: 'updateCurrentUser'
    }
  ])('allows CUSTOMER to call $method $path', async ({ method, path, body, handler }) => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(app, method, path, body)

    expect(response.status).toBe(200)
    expect(response.body.user.id).toBe(42)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it('prevents CUSTOMER from updating another user', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(
      app,
      'patch',
      '/users/7',
      { fullname: 'Updated User' }
    )

    expect(response.status).toBe(403)
    expect(controller.updateUser).not.toHaveBeenCalled()
  })
})

describe('rooms routes', () => {
  let controller
  let app
  let authService

  beforeEach(() => {
    controller = createController([
      'listAvailableRooms',
      'getRoomById',
      'createRoom',
      'updateRoom',
      'deactivateRoom'
    ])
    ;({ app, authService } = createRouteApp({
      mountPath: '/rooms',
      createRouter: createRoomsRouter,
      dependency: 'roomsController',
      controller
    }))
  })

  it('allows CUSTOMER to view a room', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(app, 'get', '/rooms/7')

    expect(response.status).toBe(200)
    expect(response.body.validated.params).toEqual({ roomId: 7 })
    expect(controller.getRoomById).toHaveBeenCalledOnce()
  })

  it('allows CUSTOMER to search available rooms with normalized filters', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(
      app,
      'get',
      '/rooms?checkInDate=2030-01-10&checkOutDate=2030-01-12&capacity=2'
    )

    expect(response.status).toBe(200)
    expect(response.body.validated.query).toEqual({
      page: 1,
      limit: 20,
      checkInDate: '2030-01-10',
      checkOutDate: '2030-01-12',
      capacity: 2
    })
    expect(controller.listAvailableRooms).toHaveBeenCalledOnce()
  })

  it.each([
    {
      method: 'post',
      path: '/rooms',
      body: { roomNumber: '101', roomTypeId: 2 },
      handler: 'createRoom'
    },
    {
      method: 'patch',
      path: '/rooms/7',
      body: { status: 'maintenance' },
      handler: 'updateRoom'
    },
    { method: 'delete', path: '/rooms/7', handler: 'deactivateRoom' }
  ])('allows MANAGER to call $method $path', async ({ method, path, body, handler }) => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['MANAGER']
    })

    const response = await authenticatedRequest(app, method, path, body)

    expect(response.status).toBe(200)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it('authorizes before validating a protected room mutation', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(app, 'post', '/rooms', {})

    expect(response.status).toBe(403)
    expect(controller.createRoom).not.toHaveBeenCalled()
  })
})

describe('roles routes', () => {
  let controller
  let app
  let authService

  beforeEach(() => {
    controller = createController([
      'getRoleById',
      'createRole',
      'updateRole',
      'deactivateRole'
    ])
    ;({ app, authService } = createRouteApp({
      mountPath: '/roles',
      createRouter: createRolesRouter,
      dependency: 'rolesController',
      controller
    }))
  })

  it.each([
    { method: 'get', path: '/roles/3', handler: 'getRoleById' },
    {
      method: 'post',
      path: '/roles',
      body: { code: 'manager', name: 'Manager' },
      handler: 'createRole'
    },
    {
      method: 'patch',
      path: '/roles/3',
      body: { name: 'Booking manager' },
      handler: 'updateRole'
    },
    { method: 'delete', path: '/roles/3', handler: 'deactivateRole' }
  ])('allows ADMIN to call $method $path', async ({ method, path, body, handler }) => {
    authService.verifyAccessToken.mockResolvedValue(identity)

    const response = await authenticatedRequest(app, method, path, body)

    expect(response.status).toBe(200)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it('prevents MANAGER from accessing role administration', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['MANAGER']
    })

    const response = await authenticatedRequest(app, 'get', '/roles/3')

    expect(response.status).toBe(403)
    expect(controller.getRoleById).not.toHaveBeenCalled()
  })
})

describe('bookings routes', () => {
  let controller
  let app
  let authService

  beforeEach(() => {
    controller = createController([
      'listCurrentUserBookings',
      'getCurrentUserBooking',
      'cancelCurrentUserBooking',
      'getBookingById',
      'createBooking',
      'updateBooking',
      'deactivateBooking'
    ])
    ;({ app, authService } = createRouteApp({
      mountPath: '/bookings',
      createRouter: createBookingsRouter,
      dependency: 'bookingsController',
      controller
    }))
  })

  it('allows CUSTOMER to create a booking without supplying a user id', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(
      app,
      'post',
      '/bookings',
      {
        roomId: 3,
        checkInDate: '2030-01-10',
        checkOutDate: '2030-01-12'
      }
    )

    expect(response.status).toBe(200)
    expect(response.body.user.id).toBe(42)
    expect(controller.createBooking).toHaveBeenCalledOnce()
  })

  it.each([
    {
      method: 'get',
      path: '/bookings/me?page=2&limit=10',
      handler: 'listCurrentUserBookings'
    },
    {
      method: 'get',
      path: '/bookings/me/9',
      handler: 'getCurrentUserBooking'
    },
    {
      method: 'delete',
      path: '/bookings/me/9',
      handler: 'cancelCurrentUserBooking'
    }
  ])('allows CUSTOMER to call $method $path for their own bookings', async ({
    method,
    path,
    handler
  }) => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(app, method, path)

    expect(response.status).toBe(200)
    expect(response.body.user.id).toBe(42)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it.each([
    { method: 'get', path: '/bookings/9', handler: 'getBookingById' },
    {
      method: 'patch',
      path: '/bookings/9',
      body: { status: 'confirmed' },
      handler: 'updateBooking'
    },
    { method: 'delete', path: '/bookings/9', handler: 'deactivateBooking' }
  ])('allows MANAGER to call $method $path', async ({ method, path, body, handler }) => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['MANAGER']
    })

    const response = await authenticatedRequest(app, method, path, body)

    expect(response.status).toBe(200)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it('does not expose booking-by-id operations to CUSTOMER yet', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(app, 'get', '/bookings/9')

    expect(response.status).toBe(403)
    expect(controller.getBookingById).not.toHaveBeenCalled()
  })
})

describe('payments routes', () => {
  let controller
  let app
  let authService

  beforeEach(() => {
    controller = createController([
      'listCurrentUserPayments',
      'getCurrentUserPayment',
      'createCurrentUserPayment',
      'getPaymentById',
      'createPayment'
    ])
    ;({ app, authService } = createRouteApp({
      mountPath: '/payments',
      createRouter: createPaymentsRouter,
      dependency: 'paymentsController',
      controller
    }))
  })

  it.each([
    { method: 'get', path: '/payments/5', handler: 'getPaymentById' },
    {
      method: 'post',
      path: '/payments',
      body: {
        bookingId: 2,
        amount: '150000.00',
        method: 'cash',
        idempotencyKey: 'payment-request-1'
      },
      handler: 'createPayment'
    }
  ])('allows MANAGER to call $method $path', async ({ method, path, body, handler }) => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['MANAGER']
    })

    const response = await authenticatedRequest(app, method, path, body)

    expect(response.status).toBe(200)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it.each([
    {
      method: 'get',
      path: '/payments/me?page=1&limit=10',
      handler: 'listCurrentUserPayments'
    },
    {
      method: 'get',
      path: '/payments/me/5',
      handler: 'getCurrentUserPayment'
    },
    {
      method: 'post',
      path: '/payments/me',
      body: {
        bookingId: 2,
        method: 'card',
        idempotencyKey: 'customer-payment-1'
      },
      handler: 'createCurrentUserPayment'
    }
  ])('allows CUSTOMER to call $method $path for their own payments', async ({
    method,
    path,
    body,
    handler
  }) => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(app, method, path, body)

    expect(response.status).toBe(200)
    expect(response.body.user.id).toBe(42)
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it.each([
    { method: 'get', path: '/payments/5' },
    { method: 'post', path: '/payments' }
  ])('does not expose $method $path to CUSTOMER yet', async ({ method, path }) => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['CUSTOMER']
    })

    const response = await authenticatedRequest(app, method, path, {})

    expect(response.status).toBe(403)
    expect(controller.getPaymentById).not.toHaveBeenCalled()
    expect(controller.createPayment).not.toHaveBeenCalled()
  })
})

describe('user-role routes', () => {
  let controller
  let app
  let authService

  beforeEach(() => {
    controller = createController(['addUserRole', 'removeUserRole'])
    ;({ app, authService } = createRouteApp({
      mountPath: '/users',
      createRouter: createUserRolesRouter,
      dependency: 'userRolesController',
      controller
    }))
  })

  it.each([
    { method: 'post', handler: 'addUserRole' },
    { method: 'delete', handler: 'removeUserRole' }
  ])('allows ADMIN to $method a role assignment', async ({ method, handler }) => {
    authService.verifyAccessToken.mockResolvedValue(identity)

    const response = await authenticatedRequest(
      app,
      method,
      '/users/42/roles/3'
    )

    expect(response.status).toBe(200)
    expect(response.body.validated.params).toEqual({ userId: 42, roleId: 3 })
    expect(controller[handler]).toHaveBeenCalledOnce()
  })

  it('prevents MANAGER from changing role assignments', async () => {
    authService.verifyAccessToken.mockResolvedValue({
      id: 42,
      roles: ['MANAGER']
    })

    const response = await authenticatedRequest(
      app,
      'post',
      '/users/42/roles/3'
    )

    expect(response.status).toBe(403)
    expect(controller.addUserRole).not.toHaveBeenCalled()
  })
})
