import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import UserRoleService from '../../src/app/services/userRoles.service.js'
import { expectAppError } from './serviceTestAssertions.js'

const activeUser = {
  id: 1,
  status: 'active'
}

const activeRole = {
  id: 2,
  isActive: true
}

let userRepository
let roleRepository
let userRoleRepository
let userRoleService

beforeEach(() => {
  userRepository = {
    findById: vi.fn()
  }
  roleRepository = {
    findById: vi.fn()
  }
  userRoleRepository = {
    addUserRole: vi.fn(),
    deleteUserRole: vi.fn()
  }

  userRoleService = new UserRoleService({
    userRepository,
    roleRepository,
    userRoleRepository
  })
})

describe('UserRoleService [addUserRole]', () => {
  it('assigns an active role to an active user', async () => {
    // Arrange
    userRepository.findById.mockResolvedValue(activeUser)
    roleRepository.findById.mockResolvedValue(activeRole)
    userRoleRepository.addUserRole.mockResolvedValue(activeRole.id)

    // Act
    const roleId = await userRoleService.addUserRole(
      activeUser.id,
      activeRole.id
    )

    // Assert
    expect(roleId).toBe(activeRole.id)
    expect(userRepository.findById).toHaveBeenCalledOnce()
    expect(userRepository.findById).toHaveBeenCalledWith(activeUser.id)
    expect(roleRepository.findById).toHaveBeenCalledOnce()
    expect(roleRepository.findById).toHaveBeenCalledWith(activeRole.id)
    expect(userRoleRepository.addUserRole).toHaveBeenCalledOnce()
    expect(userRoleRepository.addUserRole).toHaveBeenCalledWith(
      activeUser.id,
      activeRole.id
    )
  })

  it('rejects when user does not exist', async () => {
    // Arrange
    userRepository.findById.mockResolvedValue(null)
    roleRepository.findById.mockResolvedValue(activeRole)

    // Act
    const rolePromise = userRoleService.addUserRole(999999, activeRole.id)

    // Assert
    await expectAppError(rolePromise, {
      code: 'USER_NOT_FOUND',
      message: 'User does not exist'
    })
    expect(userRoleRepository.addUserRole).not.toHaveBeenCalled()
  })

  it('rejects when user is suspended', async () => {
    // Arrange
    const suspendedUser = {
      ...activeUser,
      status: 'suspended'
    }
    userRepository.findById.mockResolvedValue(suspendedUser)
    roleRepository.findById.mockResolvedValue(activeRole)

    // Act
    const rolePromise = userRoleService.addUserRole(
      suspendedUser.id,
      activeRole.id
    )

    // Assert
    await expectAppError(rolePromise, {
      code: 'USER_SUSPENDED',
      message: 'Suspended user cannot be assigned a role'
    })
    expect(userRoleRepository.addUserRole).not.toHaveBeenCalled()
  })

  it('rejects when role does not exist', async () => {
    // Arrange
    userRepository.findById.mockResolvedValue(activeUser)
    roleRepository.findById.mockResolvedValue(null)

    // Act
    const rolePromise = userRoleService.addUserRole(activeUser.id, 999999)

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_NOT_FOUND',
      message: 'Role does not exist'
    })
    expect(userRoleRepository.addUserRole).not.toHaveBeenCalled()
  })

  it('rejects when role is inactive', async () => {
    // Arrange
    const inactiveRole = {
      ...activeRole,
      isActive: false
    }
    userRepository.findById.mockResolvedValue(activeUser)
    roleRepository.findById.mockResolvedValue(inactiveRole)

    // Act
    const rolePromise = userRoleService.addUserRole(
      activeUser.id,
      inactiveRole.id
    )

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_INACTIVE',
      message: 'Inactive role cannot be assigned'
    })
    expect(userRoleRepository.addUserRole).not.toHaveBeenCalled()
  })

  it('translates a duplicate assignment into an application error', async () => {
    // Arrange
    userRepository.findById.mockResolvedValue(activeUser)
    roleRepository.findById.mockResolvedValue(activeRole)
    userRoleRepository.addUserRole.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'user_roles_pk'
      })
    )

    // Act
    const rolePromise = userRoleService.addUserRole(
      activeUser.id,
      activeRole.id
    )

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_ALREADY_ASSIGNED',
      message: 'Role is already assigned to user'
    })
  })

  it('does not expose a data access error outside the service', async () => {
    // Arrange
    userRepository.findById.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const rolePromise = userRoleService.addUserRole(
      activeUser.id,
      activeRole.id
    )

    // Assert
    await expectAppError(rolePromise, {
      code: 'INTERNAL_ERROR',
      message: 'Internal error'
    })
    expect(userRoleRepository.addUserRole).not.toHaveBeenCalled()
  })
})

describe('UserRoleService [removeUserRole]', () => {
  it('returns true when the assigned role is removed', async () => {
    // Arrange
    userRoleRepository.deleteUserRole.mockResolvedValue(true)

    // Act
    const removed = await userRoleService.removeUserRole(
      activeUser.id,
      activeRole.id
    )

    // Assert
    expect(removed).toBe(true)
    expect(userRoleRepository.deleteUserRole).toHaveBeenCalledWith(
      activeUser.id,
      activeRole.id
    )
  })

  it('returns false when the role is not assigned to the user', async () => {
    // Arrange
    userRoleRepository.deleteUserRole.mockResolvedValue(false)

    // Act
    const removed = await userRoleService.removeUserRole(
      activeUser.id,
      activeRole.id
    )

    // Assert
    expect(removed).toBe(false)
  })

  it('allows removing an inactive role from a suspended user', async () => {
    // Arrange
    const suspendedUser = {
      ...activeUser,
      status: 'suspended'
    }
    const inactiveRole = {
      ...activeRole,
      isActive: false
    }
    userRepository.findById.mockResolvedValue(suspendedUser)
    roleRepository.findById.mockResolvedValue(inactiveRole)
    userRoleRepository.deleteUserRole.mockResolvedValue(true)

    // Act
    const removed = await userRoleService.removeUserRole(
      suspendedUser.id,
      inactiveRole.id
    )

    // Assert
    expect(removed).toBe(true)
    expect(userRoleRepository.deleteUserRole).toHaveBeenCalledWith(
      suspendedUser.id,
      inactiveRole.id
    )
  })

  it('does not expose a data access error outside the service', async () => {
    // Arrange
    userRoleRepository.deleteUserRole.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const removePromise = userRoleService.removeUserRole(
      activeUser.id,
      activeRole.id
    )

    // Assert
    await expectAppError(removePromise, {
      code: 'INTERNAL_ERROR',
      message: 'Internal error'
    })
  })
})
