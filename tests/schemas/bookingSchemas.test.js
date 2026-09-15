import { describe, it } from 'vitest'
import bookingSchemas from '../../src/app/schemas/bookings.schemas.js'
import { expectInvalid, expectValid } from './schemaTestAssertions.js'

const validBooking = {
  roomId: 3,
  checkInDate: '2030-01-10',
  checkOutDate: '2030-01-12'
}

describe('booking route schemas [params]', () => {
  it('coerces a positive booking id from the URL', async () => {
    await expectValid(
      bookingSchemas.getById.params,
      { bookingId: '9' },
      { bookingId: 9 }
    )
  })

  it('rejects an invalid booking id', async () => {
    await expectInvalid(bookingSchemas.getById.params, { bookingId: '0' })
  })
})

describe('booking route schemas [create]', () => {
  it('accepts a valid booking period', async () => {
    await expectValid(bookingSchemas.create.body, validBooking)
  })

  it.each([
    {
      label: 'room id is a string',
      input: { ...validBooking, roomId: '3' }
    },
    {
      label: 'check-in date is not a calendar date',
      input: { ...validBooking, checkInDate: '2030-02-30' }
    },
    {
      label: 'check-out is equal to check-in',
      input: { ...validBooking, checkOutDate: validBooking.checkInDate }
    },
    {
      label: 'check-out is before check-in',
      input: { ...validBooking, checkOutDate: '2030-01-09' }
    },
    {
      // Customer identity comes from authenticate middleware, never request data.
      label: 'a caller-supplied user id is present',
      input: { ...validBooking, userId: 99 }
    },
    {
      label: 'a caller-supplied status is present',
      input: { ...validBooking, status: 'confirmed' }
    }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(bookingSchemas.create.body, input)
  })
})

describe('booking route schemas [update]', () => {
  it('accepts a partial update', async () => {
    await expectValid(bookingSchemas.update.body, {
      checkOutDate: '2030-01-14',
      status: 'confirmed'
    })
  })

  it.each([
    { label: 'body is empty', input: {} },
    { label: 'status is unsupported', input: { status: 'completed' } },
    {
      label: 'both dates are present in the wrong order',
      input: { checkInDate: '2030-01-12', checkOutDate: '2030-01-10' }
    },
    { label: 'room id is present', input: { roomId: 4 } }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(bookingSchemas.update.body, input)
  })
})
