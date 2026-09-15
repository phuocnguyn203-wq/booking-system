import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import UserRolesController from '../../src/app/controllers/userRoles.controller.js'

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  res.status.mockReturnValue(res)

  return res
}

let userRoleService
let controller
let res
let next

beforeEach(() => {
  userRoleService = {
    addUserRole: vi.fn(),
    removeUserRole: vi.fn()
  }
  controller = new UserRolesController({ userRoleService })
  res = createResponse()
  next = vi.fn()
})

describe('UserRolesController [addUserRole]', () => {
  it('assigns a role and returns the assignment with status 201', async () => {
    // Arrange
    const req = { validated: { params: { userId: 42, roleId: 3 } } }
    userRoleService.addUserRole.mockResolvedValue(3)

    // Act
    await controller.addUserRole(req, res, next)

    // Assert
    expect(userRoleService.addUserRole).toHaveBeenCalledExactlyOnceWith(42, 3)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(201)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({
      data: { userId: 42, roleId: 3 }
    })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('UserRolesController [removeUserRole]', () => {
  it.each([true, false])(
    'returns status 204 when the service returns %s',
    async removed => {
      // Arrange
      const req = { validated: { params: { userId: 42, roleId: 3 } } }
      userRoleService.removeUserRole.mockResolvedValue(removed)

      // Act
      await controller.removeUserRole(req, res, next)

      // Assert
      expect(userRoleService.removeUserRole)
        .toHaveBeenCalledExactlyOnceWith(42, 3)
      expect(res.status).toHaveBeenCalledExactlyOnceWith(204)
      expect(res.send).toHaveBeenCalledExactlyOnceWith()
      expect(res.json).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    }
  )
})

describe.each(['addUserRole', 'removeUserRole'])(
  'UserRolesController [%s error handling]',
  controllerMethod => {
    it('forwards service errors to the error middleware', async () => {
      // Arrange
      const error = new AppError('Role does not exist', 'ROLE_NOT_FOUND')
      const req = { validated: { params: { userId: 42, roleId: 3 } } }
      userRoleService[controllerMethod].mockRejectedValue(error)

      // Act
      await controller[controllerMethod](req, res, next)

      // Assert
      expect(next).toHaveBeenCalledExactlyOnceWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })
  }
)
