import { describe, expect } from 'vitest'
import { it as baseIt } from 'vitest'
import { query } from '../../src/database/index.js'
import PaymentRepository from '../../src/app/repositories/payments.repository.js'
import {
  cleanBeforeEachAndAfterAll,
  createTestBookingWrapper,
  createTestPayment
} from './testHelper.js'
import { expectRepositoryError } from './repositoryTestAssertions.js'

const it = baseIt.extend('paymentRepository', () => {
  return new PaymentRepository(query)
})

await cleanBeforeEachAndAfterAll()

function createValidPaymentInfo({ bookingId, overrides = {} }) {
  return {
    bookingId,
    amount: '150000.00',
    currency: 'VND',
    method: 'card',
    provider: 'momo',
    providerTransactionId: 'momo-transaction-1',
    idempotencyKey: 'payment-request-1',
    status: 'succeeded',
    paidAt: new Date('2030-01-10T08:00:00.000Z'),
    ...overrides
  }
}

describe('PaymentRepository [findById]', () => {
  it('returns a mapped payment when payment exists', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const testPayment = await createTestPayment({
      bookingId: testBooking.id,
      amount: '150000.00',
      currency: 'VND',
      method: 'e_wallet',
      provider: 'momo',
      providerTransactionId: 'momo-transaction-1',
      idempotencyKey: 'payment-request-1',
      status: 'succeeded',
      paidAt: new Date('2030-01-10T08:00:00.000Z')
    })

    // Act
    const payment = await paymentRepository.findById(testPayment.id)

    // Assert
    expect(payment).toEqual(testPayment)
    expect(payment.amount).toBe('150000.00')
  })

  it('returns nullable payment fields as null', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const testPayment = await createTestPayment({
      bookingId: testBooking.id,
      method: 'cash'
    })

    // Act
    const payment = await paymentRepository.findById(testPayment.id)

    // Assert
    expect(payment).toMatchObject({
      provider: null,
      providerTransactionId: null,
      failureCode: null,
      failureMessage: null,
      paidAt: null
    })
  })

  it('returns null when payment does not exist', async ({ paymentRepository }) => {
    // Arrange
    const nonExistentId = 999999

    // Act
    const payment = await paymentRepository.findById(nonExistentId)

    // Assert
    expect(payment).toBeNull()
  })

  it('rejects with a data access error when database query fails', async () => {
    // Arrange
    const failingQuery = async () => {
      throw new Error('Database unavailable')
    }
    const paymentRepository = new PaymentRepository(failingQuery)

    // Act
    const paymentPromise = paymentRepository.findById(1)

    // Assert
    await expectRepositoryError(paymentPromise, {
      code: 'DATA_ACCESS_ERROR'
    })
  })
})

describe('PaymentRepository [createPayment]', () => {
  it('returns a mapped payment and inserts it into database', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const paymentInfo = createValidPaymentInfo({
      bookingId: testBooking.id
    })

    // Act
    const payment = await paymentRepository.createPayment(paymentInfo)

    // Assert
    expect(payment).toMatchObject(paymentInfo)
    expect(payment).toMatchObject({
      id: expect.any(Number),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      failureCode: null,
      failureMessage: null
    })

    const rowResult = await query(
      `SELECT * FROM payments WHERE id=$1`,
      [payment.id]
    )
    expect(rowResult.rows[0]).toMatchObject({
      booking_id: String(testBooking.id),
      amount: paymentInfo.amount,
      currency: paymentInfo.currency,
      method: paymentInfo.method,
      provider: paymentInfo.provider,
      provider_transaction_id: paymentInfo.providerTransactionId,
      idempotency_key: paymentInfo.idempotencyKey,
      status: paymentInfo.status
    })
  })

  it('uses database defaults when currency and status are omitted', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const paymentInfo = {
      bookingId: testBooking.id,
      amount: '80000.00',
      method: 'cash',
      idempotencyKey: 'cash-payment-request-1'
    }

    // Act
    const payment = await paymentRepository.createPayment(paymentInfo)

    // Assert
    expect(payment).toMatchObject({
      ...paymentInfo,
      currency: 'VND',
      status: 'pending',
      provider: null,
      providerTransactionId: null,
      failureCode: null,
      failureMessage: null,
      paidAt: null
    })
  })

  const requiredFieldCases = [
    { missingField: 'bookingId', column: 'booking_id' },
    { missingField: 'amount', column: 'amount' },
    { missingField: 'method', column: 'method' },
    { missingField: 'idempotencyKey', column: 'idempotency_key' }
  ]

  it.for(requiredFieldCases)(
    'rejects with a not-null constraint error when $missingField is missing',
    async ({ missingField, column }, { paymentRepository }) => {
      // Arrange
      const testBooking = await createTestBookingWrapper()
      const paymentInfo = createValidPaymentInfo({
        bookingId: testBooking.id
      })
      delete paymentInfo[missingField]

      // Act
      const paymentPromise = paymentRepository.createPayment(paymentInfo)

      // Assert
      await expectRepositoryError(paymentPromise, {
        code: 'NOT_NULL_CONSTRAINT',
        column
      })
    }
  )

  it('rejects with a foreign-key constraint error when booking does not exist', async ({ paymentRepository }) => {
    // Arrange
    const paymentInfo = createValidPaymentInfo({
      bookingId: 999999
    })

    // Act
    const paymentPromise = paymentRepository.createPayment(paymentInfo)

    // Assert
    await expectRepositoryError(paymentPromise, {
      code: 'FOREIGN_KEY_CONSTRAINT',
      constraint: 'payments_booking_fk'
    })
  })

  it.for([{ amount: '0.00' }, { amount: '-1.00' }])(
    'rejects with a check constraint error when amount is $amount',
    async ({ amount }, { paymentRepository }) => {
      // Arrange
      const testBooking = await createTestBookingWrapper()
      const paymentInfo = createValidPaymentInfo({
        bookingId: testBooking.id,
        overrides: { amount }
      })

      // Act
      const paymentPromise = paymentRepository.createPayment(paymentInfo)

      // Assert
      await expectRepositoryError(paymentPromise, {
        code: 'CHECK_CONSTRAINT',
        constraint: 'payments_positive_amount'
      })
    }
  )

  it('rejects with a check constraint error when method is invalid', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const paymentInfo = createValidPaymentInfo({
      bookingId: testBooking.id,
      overrides: { method: 'crypto' }
    })

    // Act
    const paymentPromise = paymentRepository.createPayment(paymentInfo)

    // Assert
    await expectRepositoryError(paymentPromise, {
      code: 'CHECK_CONSTRAINT',
      constraint: 'payments_valid_method'
    })
  })

  it('rejects with a check constraint error when status is invalid', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    const paymentInfo = createValidPaymentInfo({
      bookingId: testBooking.id,
      overrides: { status: 'refunded' }
    })

    // Act
    const paymentPromise = paymentRepository.createPayment(paymentInfo)

    // Assert
    await expectRepositoryError(paymentPromise, {
      code: 'CHECK_CONSTRAINT',
      constraint: 'payments_valid_status'
    })
  })

  it('rejects duplicate idempotency keys', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    await createTestPayment({
      bookingId: testBooking.id,
      idempotencyKey: 'duplicate-payment-request'
    })
    const duplicatePaymentInfo = createValidPaymentInfo({
      bookingId: testBooking.id,
      overrides: {
        idempotencyKey: 'duplicate-payment-request',
        providerTransactionId: 'another-provider-transaction'
      }
    })

    // Act
    const paymentPromise = paymentRepository.createPayment(duplicatePaymentInfo)

    // Assert
    await expectRepositoryError(paymentPromise, {
      code: 'UNIQUE_CONSTRAINT',
      constraint: 'payments_idempotency_key_unique'
    })
  })

  it('rejects duplicate provider transactions from the same provider', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    await createTestPayment({
      bookingId: testBooking.id,
      provider: 'momo',
      providerTransactionId: 'provider-transaction-1'
    })
    const duplicatePaymentInfo = createValidPaymentInfo({
      bookingId: testBooking.id,
      overrides: {
        idempotencyKey: 'another-payment-request',
        provider: 'momo',
        providerTransactionId: 'provider-transaction-1'
      }
    })

    // Act
    const paymentPromise = paymentRepository.createPayment(duplicatePaymentInfo)

    // Assert
    await expectRepositoryError(paymentPromise, {
      code: 'UNIQUE_CONSTRAINT',
      constraint: 'payments_provider_transaction_unique'
    })
  })

  it('allows the same transaction id for different providers', async ({ paymentRepository }) => {
    // Arrange
    const testBooking = await createTestBookingWrapper()
    await createTestPayment({
      bookingId: testBooking.id,
      provider: 'momo',
      providerTransactionId: 'shared-transaction-id'
    })
    const paymentInfo = createValidPaymentInfo({
      bookingId: testBooking.id,
      overrides: {
        idempotencyKey: 'different-provider-payment-request',
        provider: 'zalopay',
        providerTransactionId: 'shared-transaction-id'
      }
    })

    // Act
    const payment = await paymentRepository.createPayment(paymentInfo)

    // Assert
    expect(payment).toMatchObject(paymentInfo)
  })
})
