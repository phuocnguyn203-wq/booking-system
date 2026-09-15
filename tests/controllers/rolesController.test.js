import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import RolesController from '../../src/app/controllers/roles.controller.js'

const activeRole = {
  id: 1,
  code: 'MANAGER',
  name: 'Manager',
  description: 'Manages bookings',
  isActive: true
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

let roleService
let rolesController
let res
let next

beforeEach(() => {
  roleService = {
    getRoleById: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deactivateRole: vi.fn()
  }
  rolesController = new RolesController({ roleService })
  res = createResponse()
  next = vi.fn()
})

describe('RolesController [getRoleById]', () => {
  it('returns an existing role with status 200', async () => {
    // Arrange
    const req = { validated: { params: { roleId: activeRole.id } } }
    roleService.getRoleById.mockResolvedValue(activeRole)

    // Act
    await rolesController.getRoleById(req, res, next)

    // Assert
    expect(roleService.getRoleById).toHaveBeenCalledExactlyOnceWith(activeRole.id)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: activeRole })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('RolesController [createRole]', () => {
  it('creates a role and returns it with status 201', async () => {
    // Arrange
    const roleInfo = {
      code: activeRole.code,
      name: activeRole.name,
      description: activeRole.description
    }
    const req = { validated: { body: roleInfo } }
    roleService.createRole.mockResolvedValue(activeRole)

    // Act
    await rolesController.createRole(req, res, next)

    // Assert
    expect(roleService.createRole).toHaveBeenCalledExactlyOnceWith(roleInfo)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(201)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: activeRole })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('RolesController [updateRole]', () => {
  it('updates a role and returns it with status 200', async () => {
    // Arrange
    const updateInfo = {
      name: 'Booking manager',
      description: 'Manages rooms and bookings'
    }
    const updatedRole = { ...activeRole, ...updateInfo }
    const req = {
      validated: {
        params: { roleId: activeRole.id },
        body: updateInfo
      }
    }
    roleService.updateRole.mockResolvedValue(updatedRole)

    // Act
    await rolesController.updateRole(req, res, next)

    // Assert
    expect(roleService.updateRole).toHaveBeenCalledExactlyOnceWith(
      activeRole.id,
      updateInfo
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: updatedRole })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('RolesController [deactivateRole]', () => {
  it('deactivates a role and returns it with status 200', async () => {
    // Arrange
    const inactiveRole = { ...activeRole, isActive: false }
    const req = { validated: { params: { roleId: activeRole.id } } }
    roleService.deactivateRole.mockResolvedValue(inactiveRole)

    // Act
    await rolesController.deactivateRole(req, res, next)

    // Assert
    expect(roleService.deactivateRole).toHaveBeenCalledExactlyOnceWith(
      activeRole.id
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: inactiveRole })
    expect(next).not.toHaveBeenCalled()
  })
})

describe.each([
  {
    controllerMethod: 'getRoleById',
    serviceMethod: 'getRoleById',
    req: () => ({ validated: { params: { roleId: activeRole.id } } })
  },
  {
    controllerMethod: 'createRole',
    serviceMethod: 'createRole',
    req: () => ({
      validated: {
        body: {
          code: activeRole.code,
          name: activeRole.name
        }
      }
    })
  },
  {
    controllerMethod: 'updateRole',
    serviceMethod: 'updateRole',
    req: () => ({
      validated: {
        params: { roleId: activeRole.id },
        body: { name: 'Booking manager' }
      }
    })
  },
  {
    controllerMethod: 'deactivateRole',
    serviceMethod: 'deactivateRole',
    req: () => ({ validated: { params: { roleId: activeRole.id } } })
  }
])(
  'RolesController [$controllerMethod error handling]',
  ({ controllerMethod, serviceMethod, req }) => {
    it('forwards service errors to the error middleware', async () => {
      // Arrange
      const error = new AppError('Role does not exist', 'ROLE_NOT_FOUND')
      roleService[serviceMethod].mockRejectedValue(error)

      // Act
      await rolesController[controllerMethod](req(), res, next)

      // Assert
      expect(next).toHaveBeenCalledExactlyOnceWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })
  }
)
