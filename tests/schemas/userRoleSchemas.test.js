import { describe, it } from 'vitest'
import userRoleSchemas from '../../src/app/schemas/userRoles.schemas.js'
import { expectInvalid, expectValid } from './schemaTestAssertions.js'

describe('user-role route schemas [params]', () => {
  it('coerces both ids from URL params', async () => {
    await expectValid(
      userRoleSchemas.changeAssignment.params,
      { userId: '42', roleId: '3' },
      { userId: 42, roleId: 3 }
    )
  })

  it.each([
    { userId: '0', roleId: '3' },
    { userId: '42', roleId: '-1' },
    { userId: 'user', roleId: '3' },
    { userId: '42', roleId: 'role' }
  ])('rejects invalid id pair %j', async input => {
    await expectInvalid(userRoleSchemas.changeAssignment.params, input)
  })
})
