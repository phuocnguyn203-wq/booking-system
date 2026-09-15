import { describe, it } from 'vitest'
import authSchemas from '../../src/app/schemas/auth.schemas.js'
import { expectInvalid, expectValid } from './schemaTestAssertions.js'

describe('auth route schemas [login]', () => {
  it('normalizes a valid username without changing the password', async () => {
    await expectValid(
      authSchemas.login.body,
      {
        username: '  test-user  ',
        password: ' StrongPassword123! '
      },
      {
        username: 'test-user',
        password: ' StrongPassword123! '
      }
    )
  })

  it.each([
    { label: 'username is missing', input: { password: 'password' } },
    { label: 'password is empty', input: { username: 'user', password: '' } },
    {
      label: 'an unknown field is present',
      input: { username: 'user', password: 'password', rememberMe: true }
    }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(authSchemas.login.body, input)
  })
})
