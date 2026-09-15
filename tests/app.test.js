import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import createApp from '../src/app.js'
import JwtAdapter from '../src/app/adapters/jwt.adapter.js'
import PasswordHasherAdapter from '../src/app/adapters/passwordHasher.adapter.js'
import TokenService from '../src/app/services/token.service.js'

const config = {
  port: 3000,
  databaseUrl: 'postgres://unused-in-this-test',
  corsOrigins: ['http://localhost:5173'],
  jwtSecret: 'a-secure-test-secret-with-32-characters',
  accessTokenExpiresIn: '15m',
  jwtIssuer: 'booking-system',
  jwtAudience: 'booking-system-api'
}

describe('application HTTP boundary', () => {
  it('reports health and allows the configured frontend origin', async () => {
    const app = createApp({
      config,
      query: vi.fn(),
      logger: { error: vi.fn() }
    })

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { status: 'ok' } })
    expect(response.headers['access-control-allow-origin'])
      .toBe('http://localhost:5173')
  })

  it('mounts the complete auth stack with real security adapters', async () => {
    // The query mock is the database boundary; hashing, JWT, validation,
    // controller, service and route execution remain real in this test.
    const passwordHasher = new PasswordHasherAdapter({ cost: 1024 })
    const hashedPassword = await passwordHasher.hash('StrongPassword123!')
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: '42',
        username: 'test-user',
        hashed_password: hashedPassword,
        status: 'active'
      }]
    })
    const app = createApp({
      config,
      query,
      passwordHasher,
      logger: { error: vi.fn() }
    })

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: ' test-user ',
        password: 'StrongPassword123!'
      })

    expect(response.status).toBe(200)
    expect(response.body.data.accessToken).toEqual(expect.any(String))
    expect(query).toHaveBeenCalledOnce()
  })

  it('serves the current profile through the real authentication stack', async () => {
    const userRow = {
      id: '42',
      email: 'user@example.com',
      fullname: 'Test User',
      username: 'test-user',
      phone: null,
      status: 'active',
      email_verified_at: null,
      is_deleted: false
    }
    const query = vi.fn(async sql => {
      if (sql.includes('SELECT r.code'))
        return { rows: [{ code: 'CUSTOMER' }] }

      if (sql.includes('SELECT * FROM users'))
        return { rows: [userRow] }

      throw new Error(`Unexpected query in application test: ${sql}`)
    })
    const tokenService = new TokenService({
      jwt: new JwtAdapter(),
      secret: config.jwtSecret,
      accessTokenExpiresIn: config.accessTokenExpiresIn,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience
    })
    const accessToken = tokenService.signAccessToken({ sub: '42' })
    const app = createApp({ config, query, logger: { error: vi.fn() } })

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: 42,
      email: 'user@example.com',
      username: 'test-user',
      status: 'active'
    })
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('returns a stable JSON error for an unknown endpoint', async () => {
    const app = createApp({
      config,
      query: vi.fn(),
      logger: { error: vi.fn() }
    })

    const response = await request(app).get('/api/unknown')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route does not exist'
      }
    })
  })

  it('returns a safe client error for malformed JSON', async () => {
    const logger = { error: vi.fn() }
    const app = createApp({ config, query: vi.fn(), logger })

    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username":')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON'
      }
    })
    expect(logger.error).not.toHaveBeenCalled()
  })
})
