import { describe, it } from 'vitest'
import roleSchemas from '../../src/app/schemas/roles.schemas.js'
import { expectInvalid, expectValid } from './schemaTestAssertions.js'

describe('role route schemas [params]', () => {
  it('coerces a positive role id from the URL', async () => {
    await expectValid(
      roleSchemas.getById.params,
      { roleId: '3' },
      { roleId: 3 }
    )
  })

  it('rejects an invalid role id', async () => {
    await expectInvalid(roleSchemas.getById.params, { roleId: 'role-id' })
  })
})

describe('role route schemas [create]', () => {
  it('normalizes a valid role', async () => {
    await expectValid(
      roleSchemas.create.body,
      {
        code: ' manager ',
        name: ' Booking manager ',
        description: ' Manages bookings '
      },
      {
        code: 'MANAGER',
        name: 'Booking manager',
        description: 'Manages bookings'
      }
    )
  })

  it.each([
    { label: 'code is invalid', input: { code: 'booking manager', name: 'Manager' } },
    { label: 'name is empty', input: { code: 'MANAGER', name: ' ' } },
    {
      label: 'a server-owned field is present',
      input: { code: 'MANAGER', name: 'Manager', isActive: false }
    }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(roleSchemas.create.body, input)
  })
})

describe('role route schemas [update]', () => {
  it('accepts nullable description in a partial update', async () => {
    await expectValid(roleSchemas.update.body, { description: null })
  })

  it.each([
    { label: 'body is empty', input: {} },
    { label: 'role code is present', input: { code: 'ADMIN' } },
    { label: 'activation state is present', input: { isActive: false } }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(roleSchemas.update.body, input)
  })
})
