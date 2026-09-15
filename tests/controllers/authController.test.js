import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import AuthController from '../../src/app/controllers/auth.controller.js'

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  res.status.mockReturnValue(res)

  return res
}

let authService
let authController
let res
let next

beforeEach(() => {
  authService = { login: vi.fn() }
  authController = new AuthController({ authService })
  res = createResponse()
  next = vi.fn()
})

describe('AuthController [login]', () => {
  it('logs in with validated credentials and returns the token', async () => {
    // Arrange
    const credentials = {
      username: 'test-user',
      password: 'StrongPassword123!'
    }
    const authentication = { accessToken: 'signed-access-token' }
    const req = { validated: { body: credentials } }
    authService.login.mockResolvedValue(authentication)

    // Act
    await authController.login(req, res, next)

    // Assert
    expect(authService.login).toHaveBeenCalledExactlyOnceWith(credentials)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: authentication })
    expect(next).not.toHaveBeenCalled()
  })

  it('forwards authentication errors to the error middleware', async () => {
    // Arrange
    const error = new AppError(
      'Username or password is incorrect',
      'INVALID_CREDENTIALS'
    )
    const req = {
      validated: {
        body: { username: 'test-user', password: 'incorrect' }
      }
    }
    authService.login.mockRejectedValue(error)

    // Act
    await authController.login(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledExactlyOnceWith(error)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })
})
