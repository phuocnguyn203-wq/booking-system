import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import RoleService from '../../src/app/services/roles.service.js'
import { expectAppError } from './serviceTestAssertions.js'

const activeRole = {
  id: 1,
  code: 'MANAGER',
  name: 'Manager',
  description: 'Manages bookings',
  isActive: true
}

let roleRepository
let roleService

beforeEach(() => {
  roleRepository = {
    findById: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn()
  }

  roleService = new RoleService({ roleRepository })
})

describe('RoleService [getRoleById]', () => {
  it('returns role information when role exists', async () => {
    // Arrange
    roleRepository.findById.mockResolvedValue(activeRole)

    // Act
    const role = await roleService.getRoleById(activeRole.id)

    // Assert
    expect(role).toEqual(activeRole)
  })

  it('also returns inactive role information', async () => {
    // Arrange
    const inactiveRole = {
      ...activeRole,
      isActive: false
    }
    roleRepository.findById.mockResolvedValue(inactiveRole)

    // Act
    const role = await roleService.getRoleById(inactiveRole.id)

    // Assert
    expect(role).toEqual(inactiveRole)
  })

  it('rejects when role does not exist', async () => {
    // Arrange
    roleRepository.findById.mockResolvedValue(null)

    // Act
    const rolePromise = roleService.getRoleById(999999)

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_NOT_FOUND'
    })
  })

  it('does not expose a data access error', async () => {
    // Arrange
    roleRepository.findById.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const rolePromise = roleService.getRoleById(activeRole.id)

    // Assert
    await expectAppError(rolePromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('RoleService [createRole]', () => {
  it('creates and returns a role', async () => {
    // Arrange
    const roleInfo = {
      code: activeRole.code,
      name: activeRole.name,
      description: activeRole.description
    }
    roleRepository.createRole.mockResolvedValue(activeRole)

    // Act
    const role = await roleService.createRole(roleInfo)

    // Assert
    expect(role).toEqual(activeRole)
    expect(roleRepository.createRole).toHaveBeenCalledWith(roleInfo)
  })

  it('rejects when role code already exists', async () => {
    // Arrange
    const roleInfo = {
      code: activeRole.code,
      name: activeRole.name
    }
    roleRepository.createRole.mockRejectedValue(
      new RepositoryError('UNIQUE_CONSTRAINT', {
        constraint: 'roles_code_key'
      })
    )

    // Act
    const rolePromise = roleService.createRole(roleInfo)

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_CODE_ALREADY_EXISTS'
    })
  })

  it('does not expose a data access error', async () => {
    // Arrange
    roleRepository.createRole.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const rolePromise = roleService.createRole({
      code: activeRole.code,
      name: activeRole.name
    })

    // Assert
    await expectAppError(rolePromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('RoleService [updateRole]', () => {
  it('updates only the role name and description', async () => {
    // Arrange
    const updateInfo = {
      name: 'Booking manager',
      description: null,
      code: 'CHANGED_CODE',
      isActive: false,
      unknownField: 'ignored'
    }
    const expectedUpdate = {
      name: updateInfo.name,
      description: updateInfo.description
    }
    const updatedRole = {
      ...activeRole,
      ...expectedUpdate
    }
    roleRepository.updateRole.mockResolvedValue(updatedRole)

    // Act
    const role = await roleService.updateRole(activeRole.id, updateInfo)

    // Assert
    expect(role).toEqual(updatedRole)
    expect(roleRepository.updateRole).toHaveBeenCalledWith(
      activeRole.id,
      expectedUpdate
    )
  })

  it('rejects when no service-updatable fields are provided', async () => {
    // Arrange
    const invalidUpdateInfo = {
      code: 'CHANGED_CODE',
      isActive: false,
      unknownField: 'ignored'
    }

    // Act
    const rolePromise = roleService.updateRole(
      activeRole.id,
      invalidUpdateInfo
    )

    // Assert
    await expectAppError(rolePromise, {
      code: 'NO_ROLE_FIELDS_TO_UPDATE'
    })
    expect(roleRepository.updateRole).not.toHaveBeenCalled()
  })

  it('rejects when role does not exist', async () => {
    // Arrange
    roleRepository.updateRole.mockResolvedValue(null)

    // Act
    const rolePromise = roleService.updateRole(999999, {
      name: 'New role name'
    })

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_NOT_FOUND'
    })
  })

  it('does not expose a data access error', async () => {
    // Arrange
    roleRepository.updateRole.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const rolePromise = roleService.updateRole(activeRole.id, {
      name: 'New role name'
    })

    // Assert
    await expectAppError(rolePromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})

describe('RoleService [deactivateRole]', () => {
  it('deactivates and returns an active role', async () => {
    // Arrange
    const inactiveRole = {
      ...activeRole,
      isActive: false
    }
    roleRepository.findById.mockResolvedValue(activeRole)
    roleRepository.updateRole.mockResolvedValue(inactiveRole)

    // Act
    const role = await roleService.deactivateRole(activeRole.id)

    // Assert
    expect(role).toEqual(inactiveRole)
    expect(roleRepository.updateRole).toHaveBeenCalledWith(
      activeRole.id,
      { isActive: false }
    )
  })

  it('returns an inactive role without updating it again', async () => {
    // Arrange
    const inactiveRole = {
      ...activeRole,
      isActive: false
    }
    roleRepository.findById.mockResolvedValue(inactiveRole)

    // Act
    const role = await roleService.deactivateRole(inactiveRole.id)

    // Assert
    expect(role).toEqual(inactiveRole)
    expect(roleRepository.updateRole).not.toHaveBeenCalled()
  })

  it('rejects when role does not exist', async () => {
    // Arrange
    roleRepository.findById.mockResolvedValue(null)

    // Act
    const rolePromise = roleService.deactivateRole(999999)

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_NOT_FOUND'
    })
    expect(roleRepository.updateRole).not.toHaveBeenCalled()
  })

  it('rejects when role disappears before it is updated', async () => {
    // Arrange
    roleRepository.findById.mockResolvedValue(activeRole)
    roleRepository.updateRole.mockResolvedValue(null)

    // Act
    const rolePromise = roleService.deactivateRole(activeRole.id)

    // Assert
    await expectAppError(rolePromise, {
      code: 'ROLE_NOT_FOUND'
    })
  })

  it('does not expose a data access error', async () => {
    // Arrange
    roleRepository.findById.mockRejectedValue(
      new RepositoryError('DATA_ACCESS_ERROR')
    )

    // Act
    const rolePromise = roleService.deactivateRole(activeRole.id)

    // Assert
    await expectAppError(rolePromise, {
      code: 'INTERNAL_ERROR'
    })
  })
})
