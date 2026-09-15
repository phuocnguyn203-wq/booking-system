import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import createAuthorize from '../../src/app/middleware/authorize.middleware.js'

function createResponse() {
  return {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
}

function expectResponseUntouched(res) {
  expect(res.status).not.toHaveBeenCalled()
  expect(res.json).not.toHaveBeenCalled()
  expect(res.send).not.toHaveBeenCalled()
}

function expectForwardedAppError(next, expected) {
  expect(next).toHaveBeenCalledOnce()

  const error = next.mock.calls[0][0]
  expect(error).toBeInstanceOf(AppError)
  expect(error).toMatchObject(expected)
  expect(error).not.toHaveProperty('statusCode')
}

let res
let next

beforeEach(() => {
  res = createResponse()
  next = vi.fn()
})

describe('authorize middleware [granted access]', () => {
  it('allows a user with the required role', () => {
    // Arrange
    const authorize = createAuthorize('MANAGER')
    const req = {
      user: { id: 1, roles: ['CUSTOMER', 'MANAGER'] }
    }

    // Act
    authorize(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledExactlyOnceWith()
    expectResponseUntouched(res)
  })

  it('allows a user matching any one of the accepted roles', () => {
    // Arrange
    const authorize = createAuthorize('ADMIN', 'MANAGER')
    const req = {
      user: { id: 1, roles: ['MANAGER'] }
    }

    // Act
    authorize(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledExactlyOnceWith()
    expectResponseUntouched(res)
  })
})

describe('authorize middleware [missing authentication]', () => {
  it('forwards AUTHENTICATION_REQUIRED when req.user is missing', () => {
    // Arrange
    const authorize = createAuthorize('ADMIN')
    const req = {}

    // Act
    authorize(req, res, next)

    // Assert
    expectForwardedAppError(next, {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Bearer access token is required'
    })
    expectResponseUntouched(res)
  })
})

describe('authorize middleware [denied access]', () => {
  it.each([
    { label: 'roles are missing', roles: undefined },
    { label: 'roles are null', roles: null },
    { label: 'roles are empty', roles: [] },
    { label: 'roles are not an array', roles: 'ADMIN' }
  ])('forwards FORBIDDEN when $label', ({ roles }) => {
    // Arrange
    const authorize = createAuthorize('ADMIN')
    const req = { user: { id: 1, roles } }

    // Act
    authorize(req, res, next)

    // Assert
    expectForwardedAppError(next, {
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action'
    })
    expectResponseUntouched(res)
  })

  it('forwards FORBIDDEN when none of the user roles are accepted', () => {
    // Arrange
    const authorize = createAuthorize('ADMIN', 'MANAGER')
    const req = {
      user: { id: 1, roles: ['CUSTOMER'] }
    }

    // Act
    authorize(req, res, next)

    // Assert
    expectForwardedAppError(next, {
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action'
    })
    expectResponseUntouched(res)
  })
})

describe('authorize middleware [configuration]', () => {
  it('rejects an empty allowed-role configuration', () => {
    expect(() => createAuthorize()).toThrow(TypeError)
  })
})
