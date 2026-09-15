import { describe, it } from 'vitest'
import roomSchemas from '../../src/app/schemas/rooms.schemas.js'
import { expectInvalid, expectValid } from './schemaTestAssertions.js'

const validRoom = {
  roomNumber: '101',
  roomTypeId: 2,
  floor: 1,
  status: 'active'
}

describe('room route schemas [params]', () => {
  it('coerces a positive room id from the URL', async () => {
    await expectValid(
      roomSchemas.getById.params,
      { roomId: '7' },
      { roomId: 7 }
    )
  })

  it('rejects an invalid room id', async () => {
    await expectInvalid(roomSchemas.getById.params, { roomId: '1.5' })
  })
})

describe('room route schemas [create]', () => {
  it('normalizes a valid room', async () => {
    await expectValid(
      roomSchemas.create.body,
      { ...validRoom, roomNumber: ' 101 ' },
      validRoom
    )
  })

  it('allows optional values to use repository defaults', async () => {
    const input = { roomNumber: '101', roomTypeId: 2 }

    await expectValid(roomSchemas.create.body, input)
  })

  it.each([
    { label: 'room type id is not positive', input: { ...validRoom, roomTypeId: 0 } },
    { label: 'room type id is a string', input: { ...validRoom, roomTypeId: '2' } },
    { label: 'floor is not an integer', input: { ...validRoom, floor: 1.5 } },
    { label: 'status is unsupported', input: { ...validRoom, status: 'cleaning' } },
    { label: 'a server-owned field is present', input: { ...validRoom, isDeleted: false } }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(roomSchemas.create.body, input)
  })
})

describe('room route schemas [update]', () => {
  it('accepts a partial room update', async () => {
    await expectValid(
      roomSchemas.update.body,
      { floor: null, status: 'maintenance' }
    )
  })

  it.each([
    { label: 'body is empty', input: {} },
    { label: 'status is unsupported', input: { status: 'cleaning' } },
    { label: 'an unknown field is present', input: { capacity: 2 } }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(roomSchemas.update.body, input)
  })
})
