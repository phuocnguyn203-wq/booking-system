import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import PaymentsController from '../../src/app/controllers/payments.controller.js'

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

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  res.status.mockReturnValue(res)
  return res
}

let paymentService
let paymentsController
let res
let next

beforeEach(() => {
  paymentService = {
    getPaymentById: vi.fn(),
    createPayment: vi.fn()
  }
  paymentsController = new PaymentsController({ paymentService })
  res = createResponse()
  next = vi.fn()
})

describe('PaymentsController [getPaymentById]', () => {
  it('returns an existing payment with status 200', async () => {
    // Arrange
    const req = { validated: { params: { paymentId: payment.id } } }
    paymentService.getPaymentById.mockResolvedValue(payment)

    // Act
    await paymentsController.getPaymentById(req, res, next)

    // Assert
    expect(paymentService.getPaymentById).toHaveBeenCalledExactlyOnceWith(
      payment.id
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: payment })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('PaymentsController [createPayment]', () => {
  it('creates a payment and returns it with status 201', async () => {
    // Arrange
    const paymentInfo = {
      bookingId: payment.bookingId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      idempotencyKey: payment.idempotencyKey
    }
    const req = { validated: { body: paymentInfo } }
    paymentService.createPayment.mockResolvedValue(payment)

    // Act
    await paymentsController.createPayment(req, res, next)

    // Assert
    expect(paymentService.createPayment).toHaveBeenCalledExactlyOnceWith(
      paymentInfo
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(201)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: payment })
    expect(next).not.toHaveBeenCalled()
  })
})

describe.each([
  {
    controllerMethod: 'getPaymentById',
    serviceMethod: 'getPaymentById',
    req: () => ({ validated: { params: { paymentId: payment.id } } }),
    error: () => new AppError('Payment does not exist', 'PAYMENT_NOT_FOUND')
  },
  {
    controllerMethod: 'createPayment',
    serviceMethod: 'createPayment',
    req: () => ({
      validated: {
        body: {
          bookingId: payment.bookingId,
          amount: payment.amount,
          method: payment.method,
          idempotencyKey: payment.idempotencyKey
        }
      }
    }),
    error: () => new AppError(
      'Payment data is invalid',
      'INVALID_PAYMENT_DATA'
    )
  }
])(
  'PaymentsController [$controllerMethod error handling]',
  ({ controllerMethod, serviceMethod, req, error }) => {
    it('forwards service errors to the error middleware', async () => {
      // Arrange
      const serviceError = error()
      paymentService[serviceMethod].mockRejectedValue(serviceError)

      // Act
      await paymentsController[controllerMethod](req(), res, next)

      // Assert
      expect(next).toHaveBeenCalledExactlyOnceWith(serviceError)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })
  }
)
