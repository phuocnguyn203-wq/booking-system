import { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'

const STATUS_BY_ERROR_CODE = Object.freeze({
  VALIDATION_ERROR: 400,
  INVALID_BOOKING_DATA: 400,
  NO_BOOKING_FIELDS_TO_UPDATE: 400,
  INVALID_PAYMENT_DATA: 400,
  INVALID_ROOM_DATA: 400,
  NO_ROOM_FIELDS_TO_UPDATE: 400,
  NO_ROLE_FIELDS_TO_UPDATE: 400,
  INVALID_USER_DATA: 400,
  NO_USER_FIELDS_TO_UPDATE: 400,
  INVALID_CURRENT_PASSWORD: 400,
  PASSWORD_REUSE_NOT_ALLOWED: 400,

  AUTHENTICATION_REQUIRED: 401,
  INVALID_ACCESS_TOKEN: 401,
  INVALID_CREDENTIALS: 401,

  FORBIDDEN: 403,
  ACCOUNT_NOT_ACTIVE: 403,
  USER_SUSPENDED: 403,
  ROLE_INACTIVE: 403,

  USER_NOT_FOUND: 404,
  ROLE_NOT_FOUND: 404,
  ROOM_NOT_FOUND: 404,
  ROOM_TYPE_NOT_FOUND: 404,
  PAYMENT_NOT_FOUND: 404,
  BOOKING_NOT_FOUND: 404,

  ROLE_ALREADY_ASSIGNED: 409,
  ROLE_CODE_ALREADY_EXISTS: 409,
  ROOM_NUMBER_ALREADY_EXISTS: 409,
  BOOKING_DATES_OVERLAP: 409,
  PAYMENT_REQUEST_ALREADY_EXISTS: 409,
  PAYMENT_TRANSACTION_ALREADY_EXISTS: 409,
  EMAIL_ALREADY_EXISTS: 409,
  USERNAME_ALREADY_EXISTS: 409
})

function sendInternalError(error, res, logger) {
  logger.error(error)

  return res.status(500).json({
    error: {
      code: Errors.DATA_ACCESS_ERROR.code,
      message: Errors.DATA_ACCESS_ERROR.message
    }
  })
}

export default function createErrorHandler({ logger = console } = {}) {
  if (typeof logger?.error !== 'function')
    throw new TypeError('errorHandler logger must provide an error function')

  return function errorHandler(error, req, res, next) {
    // Express owns recovery after headers are sent; attempting another response
    // here can corrupt a streamed body or trigger a second-headers exception.
    if (res.headersSent)
      return next(error)

    if (!(error instanceof AppError))
      return sendInternalError(error, res, logger)

    const status = STATUS_BY_ERROR_CODE[error.code]

    // Unmapped AppErrors are treated as internal failures. This makes adding a
    // public error code an explicit HTTP-boundary decision instead of leaking it.
    if (status === undefined)
      return sendInternalError(error, res, logger)

    const responseError = {
      code: error.code,
      message: error.message
    }

    if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details))
      responseError.details = error.details

    return res.status(status).json({ error: responseError })
  }
}
