import { describe, expect, it } from 'vitest'
import createConfig from '../src/config.js'

const requiredEnv = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/booking',
  JWT_SECRET: 'a-secure-test-secret-with-32-characters'
}

describe('createConfig', () => {
  it('loads defaults and splits allowed frontend origins', () => {
    const config = createConfig({
      ...requiredEnv,
      CORS_ORIGINS: 'http://localhost:5173, https://booking.example.com '
    })

    expect(config).toEqual({
      port: 3000,
      databaseUrl: requiredEnv.DATABASE_URL,
      corsOrigins: [
        'http://localhost:5173',
        'https://booking.example.com'
      ],
      jwtSecret: requiredEnv.JWT_SECRET,
      accessTokenExpiresIn: '15m',
      jwtIssuer: 'booking-system',
      jwtAudience: 'booking-system-api'
    })
  })

  it('accepts explicit runtime settings', () => {
    const config = createConfig({
      ...requiredEnv,
      PORT: '8080',
      ACCESS_TOKEN_EXPIRES_IN: '30m',
      JWT_ISSUER: 'booking-api',
      JWT_AUDIENCE: 'booking-web'
    })

    expect(config).toMatchObject({
      port: 8080,
      accessTokenExpiresIn: '30m',
      jwtIssuer: 'booking-api',
      jwtAudience: 'booking-web'
    })
  })

  it.each([
    { label: 'DATABASE_URL is missing', env: { JWT_SECRET: requiredEnv.JWT_SECRET } },
    { label: 'JWT_SECRET is too short', env: { ...requiredEnv, JWT_SECRET: 'short' } },
    { label: 'PORT is invalid', env: { ...requiredEnv, PORT: '70000' } },
    { label: 'CORS_ORIGINS is empty', env: { ...requiredEnv, CORS_ORIGINS: ' , ' } },
    { label: 'ACCESS_TOKEN_EXPIRES_IN is empty', env: { ...requiredEnv, ACCESS_TOKEN_EXPIRES_IN: ' ' } },
    { label: 'JWT_ISSUER is empty', env: { ...requiredEnv, JWT_ISSUER: '' } },
    { label: 'JWT_AUDIENCE is empty', env: { ...requiredEnv, JWT_AUDIENCE: '' } }
  ])('rejects configuration when $label', ({ env }) => {
    expect(() => createConfig(env)).toThrow(TypeError)
  })
})
