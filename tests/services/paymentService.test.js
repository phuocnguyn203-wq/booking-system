import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import PaymentService from '../../src/app/services/payments.service.js'
import { expectAppError } from './serviceTestAssertions.js'

// TDD contract: implement payments.service.js with
// constructor({ paymentRepository }) and the public methods below.
const payment = {
  id: 1,
  bookingId: 2,
  amount: '150000.00',
  currency: 'VND',
  method: 'e_wallet',
  provider: 'momo',
  providerTransactionId: 'momo-transaction-1',
  idempotencyKey: 'payment-request-1',
  status: 'pending',
  failureCode: null,
  failureMessage: null,
  paidAt: null,
  createdAt: new Date('2030-01-10T08:00:00.000Z'),
  updatedAt: new Date('2030-01-10T08:00:00.000Z')
}

let paymentRepository
let paymentService
let paymentInfo

beforeEach(() => {
  paymentRepository = {
    findById: vi.fn(),
    createPayment: vi.fn()
  }
  paymentInfo = {
    bookingId: payment.bookingId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    provider: payment.provider,
    providerTransactionId: payment.providerTransactionId,
    idempotencyKey: payment.idempotencyKey
  }
  paymentService = new PaymentService({ paymentRepository })
})

describe('PaymentService [getPaymentById]', () => {
  it.each(['pending', 'processing', 'succeeded', 'failed', 'cancelled'])(
    'returns an existing payment with status %s',
    async status => {
      // Arrange
      const existingPayment = { ...payment, status }
      paymentRepository.findById.mockResolvedValue(existingPayment)

      // Act
      const result = await paymentService.getPaymentById(existingPayment.id)

      // Assert
      expect(result).toEqual(existingPayment)
      expect(paymentRepository.findById).toHaveBeenCalledExactlyOnceWith(
        existingPayment.id
      )
    }
  )

  it('rejects when payment does not exist', async () => {
    // Arrange
    paymentRepository.findById.mockResolvedValue(null)

    // Act
    const paymentPromise = paymentService.getPaymentById(999999)

    // Assert
    await expectAppError(paymentPromise, {
      code: 'PAYMENT_NOT_FOUND',
      message: 'Payment does not exist'
    })
  })
})

describe('PaymentService [createPayment]', () => {
  it('creates and returns a payment', async () => {
    // Arrange
    paymentRepository.createPayment.mockResolvedValue(payment)

    // Act
    const result = await paymentService.createPayment(paymentInfo)

    // Assert
    expect(result).toEqual(payment)
    expect(paymentRepository.createPayment).toHaveBeenCalledExactlyOnceWith(
      paymentInfo
    )
  })

  it('allows currency and status to be omitted so repository defaults apply', async () => {
    // Arrange
    const minimalPaymentInfo = {
      bookingId: payment.bookingId,
      amount: payment.amount,
      method: 'cash',
      idempotencyKey: payment.idempotencyKey
    }
    const createdPayment = {
      ...payment,
      method: 'cash',
      provider: null,
      providerTransactionId: null,
      currency: 'VND',
      status: 'pending'
    }
    paymentRepository.createPayment.mockResolvedValue(createdPayment)

    // Act
    const result = await paymentService.createPayment(minimalPaymentInfo)

    // Assert
    expect(result).toEqual(createdPayment)
    expect(paymentRepository.createPayment).toHaveBeenCalledExactlyOnceWith(
      minimalPaymentInfo
    )
  })

  it('maps a missing booking to BOOKING_NOT_FOUND', async () => {
    // Arrange
    paymentRepository.createPayment.mockRejectedValue(
      new RepositoryError('FOREIGN_KEY_CONSTRAINT', {
        constraint: 'payments_booking_fk'
      })
    )

    // Act
    const paymentPromise = paymentService.createPayment(paymentInfo)

    // Assert
    await expectAppError(paymentPromise, {
      code: 'BOOKING_NOT_FOUND',
      message: 'Booking does not exist'
    })
  })

  it('maps a duplicate idempotency key to PAYMENT_REQUEST_ALREADY_EXISTS', async () => {
    // Arrange
    paymentRepository.createPayment.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'payments_idempotency_key_unique'
      })
    )

    // Act
    const paymentPromise = paymentService.createPayment(paymentInfo)

    // Assert
    await expectAppError(paymentPromise, {
      code: 'PAYMENT_REQUEST_ALREADY_EXISTS',
      message: 'Payment request already exists'
    })
  })

  it('maps a duplicate provider transaction to PAYMENT_TRANSACTION_ALREADY_EXISTS', async () => {
    // Arrange
    paymentRepository.createPayment.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'payments_provider_transaction_unique'
      })
    )

    // Act
    const paymentPromise = paymentService.createPayment(paymentInfo)

    // Assert
    await expectAppError(paymentPromise, {
      code: 'PAYMENT_TRANSACTION_ALREADY_EXISTS',
      message: 'Payment transaction already exists'
    })
  })

  it.each([
    {
      label: 'a required field is null',
      error: new RepositoryError('NOT_NULL_CONSTRAINT', { column: 'amount' })
    },
    {
      label: 'the amount is invalid',
      error: new RepositoryError('CHECK_CONSTRAINT', {
        constraint: 'payments_positive_amount'
      })
    },
    {
      label: 'the method is invalid',
      error: new RepositoryError('CHECK_CONSTRAINT', {
        constraint: 'payments_valid_method'
      })
    },
    {
      label: 'the status is invalid',
      error: new RepositoryError('CHECK_CONSTRAINT', {
        constraint: 'payments_valid_status'
      })
    }
  ])('maps $label to INVALID_PAYMENT_DATA', async ({ error }) => {
    // Arrange
    paymentRepository.createPayment.mockRejectedValue(error)

    // Act
    const paymentPromise = paymentService.createPayment(paymentInfo)

    // Assert
    await expectAppError(paymentPromise, {
      code: 'INVALID_PAYMENT_DATA',
      message: 'Payment data is invalid'
    })
  })

  it.each([
    new RepositoryError('UNIQUE_CONSTRAINT', {
      constraint: 'unrelated_unique_key'
    }),
    new RepositoryError('FOREIGN_KEY_CONSTRAINT', {
      constraint: 'unrelated_foreign_key'
    })
  ])('does not expose an unrelated constraint error', async repositoryError => {
    // Arrange
    paymentRepository.createPayment.mockRejectedValue(repositoryError)

    // Act
    const paymentPromise = paymentService.createPayment(paymentInfo)

    // Assert
    await expectAppError(paymentPromise, {
      code: 'INTERNAL_ERROR',
      message: 'Internal error'
    })
  })
})

describe.each([
  {
    serviceMethod: 'getPaymentById',
    repositoryMethod: 'findById',
    args: () => [payment.id]
  },
  {
    serviceMethod: 'createPayment',
    repositoryMethod: 'createPayment',
    args: () => [paymentInfo]
  }
])(
  'PaymentService [$serviceMethod error handling]',
  ({ serviceMethod, repositoryMethod, args }) => {
    it.each(['DATA_ACCESS_ERROR', 'UNKNOWN_REPOSITORY_ERROR'])(
      'does not expose repository error %s',
      async code => {
        // Arrange
        paymentRepository[repositoryMethod].mockRejectedValue(
          new RepositoryError(code, {
            cause: new Error('Private database details')
          })
        )

        // Act
        const paymentPromise = paymentService[serviceMethod](...args())

        // Assert
        await expectAppError(paymentPromise, {
          code: 'INTERNAL_ERROR',
          message: 'Internal error'
        })
      }
    )

    it('preserves an existing AppError', async () => {
      // Arrange
      const error = new AppError(
        'Payment operation unavailable',
        'PAYMENT_OPERATION_UNAVAILABLE'
      )
      paymentRepository[repositoryMethod].mockRejectedValue(error)

      // Act and assert
      await expect(paymentService[serviceMethod](...args())).rejects.toBe(error)
    })

    it('rethrows an unexpected error unchanged', async () => {
      // Arrange
      const error = new TypeError('Unexpected service dependency failure')
      paymentRepository[repositoryMethod].mockRejectedValue(error)

      // Act and assert
      await expect(paymentService[serviceMethod](...args())).rejects.toBe(error)
    })
  }
)
