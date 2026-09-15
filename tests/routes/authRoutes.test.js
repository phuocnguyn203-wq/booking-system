import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthController from '../../src/app/controllers/auth.controller.js'
import createAppError from '../../src/app/errors/AppError.js'
import Errors from '../../src/app/errors/errorDefinitions.js'
import createErrorHandler from '../../src/app/middleware/errorHandler.middleware.js'
import createAuthRouter from '../../src/app/routes/auth.routes.js'

let authService
let logger
let app

beforeEach(() => {
  authService = { login: vi.fn() }
  logger = { error: vi.fn() }

  const authController = new AuthController({ authService })
  app = express()
  app.use(express.json())
  app.use('/auth', createAuthRouter({ authController }))
  app.use(createErrorHandler({ logger }))
})

describe('auth routes [POST /auth/login]', () => {
  it('validates credentials and returns an access token', async () => {
    // Arrange
    authService.login.mockResolvedValue({ accessToken: 'signed-access-token' })

    // Act
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: '  test-user  ',
        password: 'StrongPassword123!'
      })

    // Assert
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { accessToken: 'signed-access-token' }
    })
    expect(authService.login).toHaveBeenCalledExactlyOnceWith({
      username: 'test-user',
      password: 'StrongPassword123!'
    })
  })

  it('rejects invalid input before calling AuthService', async () => {
    // Act
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'test-user', password: '' })

    // Assert
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [
          {
            location: 'body',
            path: ['password']
          }
        ]
      }
    })
    expect(authService.login).not.toHaveBeenCalled()
  })

  it('rejects unknown request fields before calling AuthService', async () => {
    // Unknown fields are rejected at the boundary so security-sensitive login
    // options cannot start working accidentally after a dependency upgrade.
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: 'test-user',
        password: 'StrongPassword123!',
        bypassMfa: true
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(authService.login).not.toHaveBeenCalled()
  })

  it('maps invalid credentials through the centralized error handler', async () => {
    // Arrange
    authService.login.mockRejectedValue(
      createAppError(Errors.INVALID_CREDENTIALS)
    )

    // Act
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'test-user', password: 'incorrect' })

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Username or password is incorrect'
      }
    })
    expect(logger.error).not.toHaveBeenCalled()
  })
})

describe('auth routes [unsupported method]', () => {
  it('does not expose a GET login endpoint', async () => {
    const response = await request(app).get('/auth/login')

    expect(response.status).toBe(404)
    expect(authService.login).not.toHaveBeenCalled()
  })
})
