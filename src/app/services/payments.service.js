import createAppError, { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'
import RepositoryError from '../errors/RepositoryError.js'

function mapRepositoryError(error) {
  if (
    error.code === 'FOREIGN_KEY_CONSTRAINT' &&
    error.constraint === 'payments_booking_fk'
  ) {
    return createAppError(Errors.BOOKING_NOT_FOUND)
  }

  if (
    error.code === 'UNIQUE_CONSTRAINT' &&
    error.constraint === 'payments_idempotency_key_unique'
  ) {
    return createAppError(Errors.PAYMENT_REQUEST_ALREADY_EXISTS)
  }

  if (
    error.code === 'UNIQUE_CONSTRAINT' &&
    error.constraint === 'payments_provider_transaction_unique'
  ) {
    return createAppError(Errors.PAYMENT_TRANSACTION_ALREADY_EXISTS)
  }

  if (
    error.code === 'NOT_NULL_CONSTRAINT' ||
    error.code === 'CHECK_CONSTRAINT'
  ) {
    return createAppError(Errors.INVALID_PAYMENT_DATA)
  }

  return createAppError(Errors.DATA_ACCESS_ERROR)
}

function throwServiceError(error) {
  if (error instanceof AppError)
    throw error

  if (error instanceof RepositoryError)
    throw mapRepositoryError(error)

  throw error
}

export default class PaymentService {
  constructor({ paymentRepository }) {
    this.paymentRepository = paymentRepository
  }

  async getPaymentById(paymentId) {
    try {
      const payment = await this.paymentRepository.findById(paymentId)

      if (payment === null)
        throw createAppError(Errors.PAYMENT_NOT_FOUND)

      return payment
    } catch (error) {
      throwServiceError(error)
    }
  }

  async createPayment(paymentInfo) {
    try {
      return await this.paymentRepository.createPayment(paymentInfo)
    } catch (error) {
      throwServiceError(error)
    }
  }
}
