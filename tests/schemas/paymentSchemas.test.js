import { describe, it } from 'vitest'
import paymentSchemas from '../../src/app/schemas/payments.schemas.js'
import { expectInvalid, expectValid } from './schemaTestAssertions.js'

const validPayment = {
  bookingId: 2,
  amount: '150000.00',
  currency: 'VND',
  method: 'e_wallet',
  provider: 'momo',
  providerTransactionId: 'momo-transaction-1',
  idempotencyKey: 'payment-request-1'
}

describe('payment route schemas [params]', () => {
  it('coerces a positive payment id from the URL', async () => {
    await expectValid(
      paymentSchemas.getById.params,
      { paymentId: '5' },
      { paymentId: 5 }
    )
  })

  it('rejects an invalid payment id', async () => {
    await expectInvalid(paymentSchemas.getById.params, { paymentId: '-1' })
  })
})

describe('payment route schemas [current user]', () => {
  it('accepts payment intent without a caller-controlled amount', async () => {
    const input = {
      bookingId: 2,
      method: 'card',
      provider: 'stripe',
      idempotencyKey: 'payment-request-1'
    }

    await expectValid(paymentSchemas.createCurrent.body, input)
  })

  it('rejects a caller-controlled amount', async () => {
    await expectInvalid(paymentSchemas.createCurrent.body, {
      bookingId: 2,
      amount: '1.00',
      method: 'card',
      idempotencyKey: 'payment-request-1'
    })
  })

  it('applies list pagination defaults', async () => {
    await expectValid(
      paymentSchemas.listCurrent.query,
      {},
      { page: 1, limit: 20 }
    )
  })
})

describe('payment route schemas [create]', () => {
  it('normalizes a valid payment request', async () => {
    await expectValid(
      paymentSchemas.create.body,
      {
        ...validPayment,
        currency: ' vnd ',
        provider: ' momo ',
        idempotencyKey: ' payment-request-1 '
      },
      validPayment
    )
  })

  it('allows optional provider data and currency to be omitted', async () => {
    const input = {
      bookingId: 2,
      amount: '150000',
      method: 'cash',
      idempotencyKey: 'cash-payment-1'
    }

    await expectValid(paymentSchemas.create.body, input)
  })

  it.each([
    { label: 'booking id is invalid', input: { ...validPayment, bookingId: 0 } },
    { label: 'booking id is a string', input: { ...validPayment, bookingId: '2' } },
    { label: 'amount is zero', input: { ...validPayment, amount: '0.00' } },
    { label: 'amount has too many decimals', input: { ...validPayment, amount: '10.999' } },
    { label: 'currency is invalid', input: { ...validPayment, currency: 'VN' } },
    { label: 'method is unsupported', input: { ...validPayment, method: 'crypto' } },
    {
      label: 'a server-owned status is present',
      input: { ...validPayment, status: 'succeeded' }
    }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(paymentSchemas.create.body, input)
  })
})
