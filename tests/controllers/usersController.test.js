import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import UsersController from '../../src/app/controllers/users.controller.js'

const user = {
  id: 1,
  email: 'user@example.com',
  fullname: 'Test User',
  username: 'test-user',
  phone: '0123456789',
  status: 'active',
  emailVerifiedAt: null,
  isDeleted: false
}

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  res.status.mockReturnValue(res)
  return res
}

let userService
let usersController
let res
let next

beforeEach(() => {
  userService = {
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn(),
    changePassword: vi.fn()
  }
  usersController = new UsersController({ userService })
  res = createResponse()
  next = vi.fn()
})

describe('UsersController [getUserById]', () => {
  it('returns an existing user with status 200', async () => {
    // Arrange
    const req = { validated: { params: { userId: user.id } } }
    userService.getUserById.mockResolvedValue(user)

    // Act
    await usersController.getUserById(req, res, next)

    // Assert
    expect(userService.getUserById).toHaveBeenCalledExactlyOnceWith(user.id)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: user })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('UsersController [createUser]', () => {
  it('creates a user and returns it with status 201', async () => {
    // Arrange
    const userInfo = {
      email: user.email,
      fullname: user.fullname,
      username: user.username,
      phone: user.phone,
      password: 'StrongPassword123!'
    }
    const req = { validated: { body: userInfo } }
    userService.createUser.mockResolvedValue(user)

    // Act
    await usersController.createUser(req, res, next)

    // Assert
    expect(userService.createUser).toHaveBeenCalledExactlyOnceWith(userInfo)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(201)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: user })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('UsersController [updateUser]', () => {
  it('updates a user and returns it with status 200', async () => {
    // Arrange
    const updateInfo = {
      fullname: 'Updated User',
      phone: '0987654321'
    }
    const updatedUser = { ...user, ...updateInfo }
    const req = {
      validated: {
        params: { userId: user.id },
        body: updateInfo
      }
    }
    userService.updateUser.mockResolvedValue(updatedUser)

    // Act
    await usersController.updateUser(req, res, next)

    // Assert
    expect(userService.updateUser).toHaveBeenCalledExactlyOnceWith(
      user.id,
      updateInfo
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: updatedUser })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('UsersController [deactivateUser]', () => {
  it.each([true, false])(
    'returns status 204 when the service returns %s',
    async deactivated => {
      // Arrange
      const req = { validated: { params: { userId: user.id } } }
      userService.deactivateUser.mockResolvedValue(deactivated)

      // Act
      await usersController.deactivateUser(req, res, next)

      // Assert
      expect(userService.deactivateUser).toHaveBeenCalledExactlyOnceWith(user.id)
      expect(res.status).toHaveBeenCalledExactlyOnceWith(204)
      expect(res.send).toHaveBeenCalledExactlyOnceWith()
      expect(res.json).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    }
  )
})

describe('UsersController [changePassword]', () => {
  it('changes the password and returns the user with status 200', async () => {
    // Arrange
    const passwordInfo = {
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword456!'
    }
    const req = {
      user: { id: user.id },
      validated: {
        body: passwordInfo
      }
    }
    userService.changePassword.mockResolvedValue(user)

    // Act
    await usersController.changePassword(req, res, next)

    // Assert
    expect(userService.changePassword).toHaveBeenCalledExactlyOnceWith(
      user.id,
      passwordInfo.currentPassword,
      passwordInfo.newPassword
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: user })
    expect(next).not.toHaveBeenCalled()
  })
})

describe.each([
  {
    controllerMethod: 'getUserById',
    serviceMethod: 'getUserById',
    req: () => ({ validated: { params: { userId: user.id } } })
  },
  {
    controllerMethod: 'createUser',
    serviceMethod: 'createUser',
    req: () => ({
      validated: { body: { email: user.email, password: 'password' } }
    })
  },
  {
    controllerMethod: 'updateUser',
    serviceMethod: 'updateUser',
    req: () => ({
      validated: {
        params: { userId: user.id },
        body: { fullname: 'Updated User' }
      }
    })
  },
  {
    controllerMethod: 'deactivateUser',
    serviceMethod: 'deactivateUser',
    req: () => ({ validated: { params: { userId: user.id } } })
  },
  {
    controllerMethod: 'changePassword',
    serviceMethod: 'changePassword',
    req: () => ({
      user: { id: user.id },
      validated: {
        body: {
          currentPassword: 'CurrentPassword123!',
          newPassword: 'NewPassword456!'
        }
      }
    })
  }
])(
  'UsersController [$controllerMethod error handling]',
  ({ controllerMethod, serviceMethod, req }) => {
    it('forwards service errors to the error middleware', async () => {
      // Arrange
      const error = new AppError('User does not exist', 'USER_NOT_FOUND')
      userService[serviceMethod].mockRejectedValue(error)

      // Act
      await usersController[controllerMethod](req(), res, next)

      // Assert
      expect(next).toHaveBeenCalledExactlyOnceWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })
  }
)
