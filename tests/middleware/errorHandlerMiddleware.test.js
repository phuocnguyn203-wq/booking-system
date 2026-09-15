import { beforeEach, describe, expect, it, vi } from 'vitest'
import createAppError, { AppError } from '../../src/app/errors/AppError.js'
import Errors from '../../src/app/errors/errorDefinitions.js'
import createErrorHandler from '../../src/app/middleware/errorHandler.middleware.js'

const clientErrorCases = [
  { error: Errors.INVALID_BOOKING_DATA, status: 400 },
  { error: Errors.NO_BOOKING_FIELDS_TO_UPDATE, status: 400 },
  { error: Errors.INVALID_PAYMENT_DATA, status: 400 },
  { error: Errors.INVALID_ROOM_DATA, status: 400 },
  { error: Errors.NO_ROOM_FIELDS_TO_UPDATE, status: 400 },
  { error: Errors.NO_ROLE_FIELDS_TO_UPDATE, status: 400 },
  { error: Errors.INVALID_USER_DATA, status: 400 },
  { error: Errors.NO_USER_FIELDS_TO_UPDATE, status: 400 },
  { error: Errors.INVALID_CURRENT_PASSWORD, status: 400 },
  { error: Errors.PASSWORD_REUSE_NOT_ALLOWED, status: 400 },
  { error: Errors.AUTHENTICATION_REQUIRED, status: 401 },
  { error: Errors.INVALID_ACCESS_TOKEN, status: 401 },
  { error: Errors.INVALID_CREDENTIALS, status: 401 },
  { error: Errors.FORBIDDEN, status: 403 },
  { error: Errors.ACCOUNT_NOT_ACTIVE, status: 403 },
  { error: Errors.USER_SUSPENDED, status: 403 },
  { error: Errors.ROLE_INACTIVE, status: 403 },
  { error: Errors.USER_NOT_FOUND, status: 404 },
  { error: Errors.ROLE_NOT_FOUND, status: 404 },
  { error: Errors.ROOM_NOT_FOUND, status: 404 },
  { error: Errors.ROOM_TYPE_NOT_FOUND, status: 404 },
  { error: Errors.PAYMENT_NOT_FOUND, status: 404 },
  { error: Errors.BOOKING_NOT_FOUND, status: 404 },
  { error: Errors.ROLE_ALREADY_ASSIGNED, status: 409 },
  { error: Errors.ROLE_CODE_ALREADY_EXISTS, status: 409 },
  { error: Errors.ROOM_NUMBER_ALREADY_EXISTS, status: 409 },
  { error: Errors.BOOKING_DATES_OVERLAP, status: 409 },
  { error: Errors.PAYMENT_REQUEST_ALREADY_EXISTS, status: 409 },
  { error: Errors.PAYMENT_TRANSACTION_ALREADY_EXISTS, status: 409 },
  { error: Errors.EMAIL_ALREADY_EXISTS, status: 409 },
  { error: Errors.USERNAME_ALREADY_EXISTS, status: 409 }
]

function createResponse({ headersSent = false } = {}) {
  const res = {
    headersSent,
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  res.status.mockReturnValue(res)

  return res
}

function expectResponseUntouched(res) {
  expect(res.status).not.toHaveBeenCalled()
  expect(res.json).not.toHaveBeenCalled()
  expect(res.send).not.toHaveBeenCalled()
}

let logger
let errorHandler
let req
let res
let next

beforeEach(() => {
  logger = { error: vi.fn() }
  errorHandler = createErrorHandler({ logger })
  req = {}
  res = createResponse()
  next = vi.fn()
})

describe('errorHandler middleware [expected application errors]', () => {
  // This table is the HTTP boundary for domain errors. Services remain unaware
  // of transport status codes, and new error codes require an explicit decision.
  it.each(clientErrorCases)(
    'responds with $status for $error.code',
    ({ error: errorDefinition, status }) => {
      // Arrange
      const error = createAppError(errorDefinition)

      // Act
      errorHandler(error, req, res, next)

      // Assert
      expect(res.status).toHaveBeenCalledExactlyOnceWith(status)
      expect(res.json).toHaveBeenCalledExactlyOnceWith({
        error: {
          code: errorDefinition.code,
          message: errorDefinition.message
        }
      })
      expect(logger.error).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    }
  )

  it('includes normalized field details for a validation error', () => {
    // Arrange
    const details = [
      {
        location: 'body',
        path: ['email'],
        message: 'Invalid email address'
      }
    ]
    const error = createAppError(Errors.VALIDATION_ERROR, details)

    // Act
    errorHandler(error, req, res, next)

    // Assert
    expect(res.status).toHaveBeenCalledExactlyOnceWith(400)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details
      }
    })
    expect(res.json.mock.calls[0][0].error).not.toHaveProperty('statusCode')
    expect(logger.error).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('does not expose arbitrary details from non-validation errors', () => {
    // Arrange
    const error = createAppError(Errors.INVALID_CREDENTIALS, {
      usernameExists: true
    })

    // Act
    errorHandler(error, req, res, next)

    // Assert
    expect(res.json).toHaveBeenCalledExactlyOnceWith({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Username or password is incorrect'
      }
    })
  })
})

describe('errorHandler middleware [internal errors]', () => {
  it.each([
    {
      label: 'a known internal AppError',
      createError: () => createAppError(Errors.DATA_ACCESS_ERROR)
    },
    {
      label: 'an unmapped AppError',
      createError: () => new AppError('Sensitive failure', 'UNMAPPED_ERROR')
    },
    {
      label: 'an unexpected error',
      createError: () => new TypeError('Database password leaked here')
    }
  ])('logs and hides $label', ({ createError }) => {
    // Arrange
    const error = createError()

    // Act
    errorHandler(error, req, res, next)

    // Assert
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(error)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(500)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal error'
      }
    })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('errorHandler middleware [response lifecycle]', () => {
  it('delegates the original error when response headers were already sent', () => {
    // Arrange
    const error = new Error('Streaming response failed')
    res = createResponse({ headersSent: true })

    // Act
    errorHandler(error, req, res, next)

    // Assert
    expect(next).toHaveBeenCalledExactlyOnceWith(error)
    expect(logger.error).not.toHaveBeenCalled()
    expectResponseUntouched(res)
  })
})

describe('errorHandler middleware [configuration]', () => {
  it('rejects a logger without an error function', () => {
    expect(() => createErrorHandler({ logger: {} })).toThrow(TypeError)
  })
})
