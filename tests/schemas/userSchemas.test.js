import { describe, it } from 'vitest'
import userSchemas from '../../src/app/schemas/users.schemas.js'
import { expectInvalid, expectValid } from './schemaTestAssertions.js'

describe('user route schemas [params]', () => {
  it('coerces a positive user id from the URL', async () => {
    await expectValid(
      userSchemas.getById.params,
      { userId: '42' },
      { userId: 42 }
    )
  })

  it.each(['0', '-1', '1.5', 'not-a-number', '9007199254740992'])(
    'rejects invalid user id %s',
    async userId => {
      await expectInvalid(userSchemas.getById.params, { userId })
    }
  )
})

describe('user route schemas [create]', () => {
  const validUser = {
    email: 'user@example.com',
    fullname: 'Test User',
    username: 'test-user',
    phone: '0123456789',
    password: 'StrongPassword123!'
  }

  it('normalizes public user input', async () => {
    await expectValid(
      userSchemas.create.body,
      {
        ...validUser,
        email: '  USER@EXAMPLE.COM ',
        fullname: '  Test User  ',
        username: '  test-user  '
      },
      validUser
    )
  })

  it.each([
    { label: 'email is invalid', input: { ...validUser, email: 'invalid' } },
    { label: 'fullname is empty', input: { ...validUser, fullname: '  ' } },
    { label: 'username is invalid', input: { ...validUser, username: 'bad user' } },
    { label: 'password is too short', input: { ...validUser, password: 'short' } },
    { label: 'phone is invalid', input: { ...validUser, phone: 'abc' } },
    {
      label: 'a server-owned field is present',
      input: { ...validUser, status: 'active' }
    }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(userSchemas.create.body, input)
  })
})

describe('user route schemas [update]', () => {
  it('accepts and normalizes a partial public profile', async () => {
    await expectValid(
      userSchemas.update.body,
      { fullname: '  Updated User ', phone: null },
      { fullname: 'Updated User', phone: null }
    )
  })

  it.each([
    { label: 'body is empty', input: {} },
    { label: 'email is invalid', input: { email: 'invalid' } },
    { label: 'a protected field is present', input: { status: 'suspended' } }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(userSchemas.update.body, input)
  })
})

describe('user route schemas [change password]', () => {
  it('accepts current and new passwords', async () => {
    const input = {
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!'
    }

    await expectValid(userSchemas.changePassword.body, input)
  })

  it.each([
    { label: 'current password is missing', input: { newPassword: 'NewPassword123!' } },
    {
      label: 'new password is too short',
      input: { currentPassword: 'CurrentPassword123!', newPassword: 'short' }
    },
    {
      label: 'an unknown field is present',
      input: {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewPassword123!',
        logoutOtherSessions: true
      }
    }
  ])('rejects the request when $label', async ({ input }) => {
    await expectInvalid(userSchemas.changePassword.body, input)
  })
})
