import { describe, expect, it, vi } from 'vitest'
import JwtAdapter from '../../src/app/adapters/jwt.adapter.js'

describe('JwtAdapter [library boundary]', () => {
  it('delegates signing without changing arguments or return value', () => {
    // Arrange
    const jwt = {
      sign: vi.fn().mockReturnValue('signed-token'),
      verify: vi.fn()
    }
    const adapter = new JwtAdapter({ jwt })
    const payload = { sub: '42' }
    const options = { algorithm: 'HS256', expiresIn: '15m' }

    // Act
    const token = adapter.sign(payload, 'secret', options)

    // Assert
    expect(token).toBe('signed-token')
    expect(jwt.sign).toHaveBeenCalledExactlyOnceWith(
      payload,
      'secret',
      options
    )
  })

  it('delegates verification without changing arguments or return value', () => {
    // Arrange
    const payload = { sub: '42' }
    const jwt = {
      sign: vi.fn(),
      verify: vi.fn().mockReturnValue(payload)
    }
    const adapter = new JwtAdapter({ jwt })
    const options = { algorithms: ['HS256'] }

    // Act
    const result = adapter.verify('access-token', 'secret', options)

    // Assert
    expect(result).toBe(payload)
    expect(jwt.verify).toHaveBeenCalledExactlyOnceWith(
      'access-token',
      'secret',
      options
    )
  })

  it.each([
    { label: 'sign is missing', jwt: { verify: vi.fn() } },
    { label: 'verify is missing', jwt: { sign: vi.fn() } }
  ])('rejects an implementation when $label', ({ jwt }) => {
    expect(() => new JwtAdapter({ jwt })).toThrow(TypeError)
  })
})

describe('JwtAdapter [jsonwebtoken integration]', () => {
  it('signs and verifies a token with the default implementation', () => {
    // Arrange
    const adapter = new JwtAdapter()
    const secret = 'integration-test-secret'
    const signOptions = {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: 'booking-system',
      audience: 'booking-system-api'
    }

    // Act
    const token = adapter.sign({ sub: '42' }, secret, signOptions)
    const payload = adapter.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: signOptions.issuer,
      audience: signOptions.audience
    })

    // Assert
    expect(payload).toMatchObject({
      sub: '42',
      iss: signOptions.issuer,
      aud: signOptions.audience
    })
  })

  it('preserves jsonwebtoken verification errors for TokenService to classify', () => {
    // Arrange
    const adapter = new JwtAdapter()
    const token = adapter.sign({ sub: '42' }, 'correct-secret', {
      algorithm: 'HS256'
    })

    // Act
    let thrownError
    try {
      adapter.verify(token, 'incorrect-secret', { algorithms: ['HS256'] })
    } catch (error) {
      thrownError = error
    }

    // Assert
    expect(thrownError).toMatchObject({ name: 'JsonWebTokenError' })
  })
})
