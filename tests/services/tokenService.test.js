import { beforeEach, describe, expect, it, vi } from 'vitest'
import TokenService from '../../src/app/services/token.service.js'

const secret = 'test-access-token-secret'
const accessTokenExpiresIn = '15m'
const issuer = 'booking-system'
const audience = 'booking-system-api'

let jwt
let tokenService

const createTokenService = overrides => new TokenService({
  jwt,
  secret,
  accessTokenExpiresIn,
  issuer,
  audience,
  ...overrides
})

beforeEach(() => {
  jwt = {
    sign: vi.fn(),
    verify: vi.fn()
  }
  tokenService = createTokenService()
})

describe('TokenService [constructor]', () => {
  it.each([
    { label: 'JWT adapter is missing', overrides: { jwt: undefined } },
    { label: 'sign function is missing', overrides: { jwt: { verify: vi.fn() } } },
    { label: 'verify function is missing', overrides: { jwt: { sign: vi.fn() } } },
    { label: 'secret is missing', overrides: { secret: undefined } },
    {
      label: 'access-token lifetime is missing',
      overrides: { accessTokenExpiresIn: undefined }
    },
    { label: 'issuer is missing', overrides: { issuer: undefined } },
    { label: 'audience is missing', overrides: { audience: undefined } }
  ])('rejects invalid configuration when $label', ({ overrides }) => {
    // Act and assert
    expect(() => createTokenService(overrides)).toThrow(TypeError)
  })
})

describe('TokenService [signAccessToken]', () => {
  it('signs and returns an access token with the configured JWT claims', () => {
    // Arrange
    const payload = { sub: '42' }
    jwt.sign.mockReturnValue('signed-access-token')

    // Act
    const result = tokenService.signAccessToken(payload)

    // Assert
    expect(result).toBe('signed-access-token')
    expect(jwt.sign).toHaveBeenCalledExactlyOnceWith(payload, secret, {
      algorithm: 'HS256',
      expiresIn: accessTokenExpiresIn,
      issuer,
      audience
    })
  })

  it('rethrows signing failures unchanged', () => {
    // Arrange
    const error = new Error('JWT signer unavailable')
    jwt.sign.mockImplementation(() => {
      throw error
    })

    // Act
    let thrownError
    try {
      tokenService.signAccessToken({ sub: '42' })
    } catch (caughtError) {
      thrownError = caughtError
    }

    // Assert
    expect(thrownError).toBe(error)
  })
})

describe('TokenService [verifyAccessToken]', () => {
  it('verifies and returns the access-token payload', () => {
    // Arrange
    const payload = { sub: '42', iat: 1, exp: 2 }
    jwt.verify.mockReturnValue(payload)

    // Act
    const result = tokenService.verifyAccessToken('access-token')

    // Assert
    expect(result).toBe(payload)
    expect(jwt.verify).toHaveBeenCalledExactlyOnceWith('access-token', secret, {
      algorithms: ['HS256'],
      issuer,
      audience
    })
  })

  it.each([undefined, null, '', '   ', 123])(
    'returns null without verification for an invalid token value: %j',
    token => {
      // Act
      const result = tokenService.verifyAccessToken(token)

      // Assert
      expect(result).toBeNull()
      expect(jwt.verify).not.toHaveBeenCalled()
    }
  )

  it.each(['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'])(
    'returns null when JWT verification throws %s',
    errorName => {
      // Arrange
      const error = new Error('Invalid access token')
      error.name = errorName
      jwt.verify.mockImplementation(() => {
        throw error
      })

      // Act
      const result = tokenService.verifyAccessToken('invalid-access-token')

      // Assert
      expect(result).toBeNull()
    }
  )

  it('rethrows unexpected verification failures unchanged', () => {
    // Arrange
    const error = new TypeError('JWT verifier unavailable')
    jwt.verify.mockImplementation(() => {
      throw error
    })

    // Act
    let thrownError
    try {
      tokenService.verifyAccessToken('access-token')
    } catch (caughtError) {
      thrownError = caughtError
    }

    // Assert
    expect(thrownError).toBe(error)
  })
})
