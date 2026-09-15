import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import createAuthenticate from '../../src/app/middleware/authenticate.middleware.js'

const authenticatedUser = {
  id: 1,
  roles: ['CUSTOMER']
}

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

let authService
let authenticate
let res
let next

beforeEach(() => {
  authService = {
    verifyAccessToken: vi.fn()
  }
  authenticate = createAuthenticate({ authService })
  res = createResponse()
  next = vi.fn()
})

describe('authenticate middleware [valid credentials]', () => {
  it.each(['Bearer access-token', 'bearer access-token'])(
    'authenticates the %s authorization header',
    async authorization => {
      // Arrange
      const req = { headers: { authorization } }
      authService.verifyAccessToken.mockResolvedValue(authenticatedUser)

      // Act
      await authenticate(req, res, next)

      // Assert
      expect(authService.verifyAccessToken).toHaveBeenCalledExactlyOnceWith(
        'access-token'
      )
      expect(req.user).toBe(authenticatedUser)
      expect(next).toHaveBeenCalledExactlyOnceWith()
      expectResponseUntouched(res)
    }
  )
})

describe('authenticate middleware [missing or malformed credentials]', () => {
  it.each([
    { label: 'headers are missing', headers: undefined },
    { label: 'authorization is missing', headers: {} },
    { label: 'authorization is empty', headers: { authorization: '' } },
    { label: 'scheme is not Bearer', headers: { authorization: 'Basic token' } },
    { label: 'token is missing', headers: { authorization: 'Bearer' } },
    {
      label: 'header contains more than one token',
      headers: { authorization: 'Bearer first-token second-token' }
    }
  ])('forwards AUTHENTICATION_REQUIRED when $label', async ({ headers }) => {
    // Arrange
    const req = { headers }

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(authService.verifyAccessToken).not.toHaveBeenCalled()
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledOnce()

    const error = next.mock.calls[0][0]
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Bearer access token is required'
    })
    expect(error).not.toHaveProperty('statusCode')
    expectResponseUntouched(res)
  })
})

describe('authenticate middleware [token verification]', () => {
  it('forwards INVALID_ACCESS_TOKEN when verification returns no identity', async () => {
    // Arrange
    const req = {
      headers: { authorization: 'Bearer invalid-access-token' }
    }
    authService.verifyAccessToken.mockResolvedValue(null)

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledOnce()

    const error = next.mock.calls[0][0]
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      code: 'INVALID_ACCESS_TOKEN',
      message: 'Access token is invalid or expired'
    })
    expect(error).not.toHaveProperty('statusCode')
    expectResponseUntouched(res)
  })

  it('forwards an AppError from the authentication service unchanged', async () => {
    // Arrange
    const req = {
      headers: { authorization: 'Bearer expired-access-token' }
    }
    const error = new AppError(
      'Access token is invalid or expired',
      'INVALID_ACCESS_TOKEN'
    )
    authService.verifyAccessToken.mockRejectedValue(error)

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledExactlyOnceWith(error)
    expectResponseUntouched(res)
  })

  it('forwards unexpected verification errors unchanged', async () => {
    // Arrange
    const req = {
      headers: { authorization: 'Bearer access-token' }
    }
    const error = new TypeError('Token verifier unavailable')
    authService.verifyAccessToken.mockRejectedValue(error)

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledExactlyOnceWith(error)
    expectResponseUntouched(res)
  })
})
