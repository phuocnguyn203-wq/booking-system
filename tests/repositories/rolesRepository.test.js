import { describe, it as baseIt, expect } from 'vitest'
import { cleanBeforeEachAndAfterAll, createTestRole } from './testHelper'
import RoleRepository from '../../src/app/repositories/roles.repository.js'
import { query } from '../../src/database/index.js'

const it = baseIt.extend('roleRepository', () => {
  return new RoleRepository(query)
})

await cleanBeforeEachAndAfterAll()

/*
Role Object:
- id: Number
- code: String
- name: String
- description: String | null
- isActive: Boolean
*/
describe('RoleRepository [findById]', () => {
  it('it returns role object when given id', async ({ roleRepository }) => {
  // Arrange
  const testRole = await createTestRole()

  // Act
  const role = await roleRepository.findById(testRole.id)

  // Assert
  expect(role).toMatchObject(testRole)
  })

  it('returns null when given not-existent id', async ({ roleRepository }) => {
    // Arrange
    const nonExistentId = 10

    // Act
    const role = await roleRepository.findById(nonExistentId)

    // Assert
    expect(role).toBeNull()
  })

})

describe('RoleRepository [createRole]', () => {
  it('returns role object and inserts into roles table', async ({ roleRepository }) => {
    // Arrange
    const roleInfo = {
      code: 'super_important_code',
      name: 'Dark Accountant',
      description: 'Do dark account to vanish tax'
    }
    
    // Act
    const role = await roleRepository.createRole(roleInfo)

    // Assert
    expect(role).toMatchObject(roleInfo)
    // Assert side effect
    const rowResult = await query(
      `SELECT id, code, name, description, is_active FROM roles WHERE id=$1`,
      [role.id]
    )
    const row = rowResult.rows[0]
    expect(row).toMatchObject(roleInfo)
  })

  it('throws AppError when given duplicated code', async ({ roleRepository}) => {
    // Arrange
    const testRole = await createTestRole()
    const duplicatedCodeInfo = {
      code: testRole.code,
      name: 'Mysterious role',
      description: null,
    }

    // Act
    const rolePromise = roleRepository.createRole(duplicatedCodeInfo)

    // Assert
    await expect(rolePromise).rejects.toMatchObject({
      statusCode: 409,
      message: 'A role with this information already exists'
    })
  })

  const incompleteRoleCases = [
  {
    missingField: 'code',
    incompleteInfo: {
      name: 'Administrator',
      description: 'Manages the system'
    }
  },
  {
    missingField: 'name',
    incompleteInfo: {
      code: 'admin',
      description: 'Manages the system'
    }
  }
]

  it.for(incompleteRoleCases)(
    'throws AppError when not given $missingField',
    async ({ incompleteInfo }, { roleRepository }) => {
      const rolePromise =
        roleRepository.createRole(incompleteInfo)

      await expect(rolePromise).rejects.toMatchObject({
        statusCode: 400,
        message: 'Required fields are missing'
      })
    })
})

describe('RoleRepository [updateRole]', () => {

  const updateFields = [
    [{ code: 'admin' }],
    [{ name: 'Administrator' }],
    [{ description: 'Very misterious' }],
    [{ isActive: false }]
  ]
  it.for(updateFields)(
    'returns new role and update $field in database', 
    async ({ updateInfo }, { roleRepository }) => {
      // Arrange
      const testRole = await createTestRole()

      // Act
      const newRole = await roleRepository.updateRole(testRole.id, updateInfo)

      // Assert
      expect(newRole).toMatchObject(updateInfo)
  })

  it('throws when no valid fields are provided', async ({ roleRepository }) => {
    // Arrange
    const invalidFields = {
      newName: 'Rocker',
      newCode: 'Desp1',
      isBoss: true
    }

    // Act
    const newRole = roleRepository.updateRole(invalidFields)

    // Assert
    await expect(newRole).rejects.toMatchObject({
      statusCode: 400,
      message: 'Field names are not correct.'
    })
  })

  it('sets description to null', async ({ roleRepository }) => {
    // Arrange
    const testRole = await createTestRole({ description: 'Manages system' })

    // Act
    await roleRepository.updateRole({ description: null })

    // Assert
    const rowResult = await query(
      `SELECT description FROM roles WHERE id=$1`, 
      [testRole.id]
    )
    expect(rowResult.rows[0].description).toBeNull()
  })

  it('returns null when role does not exist', async ({ roleRepository }) => {
    // Arrange
    const nonExistentId = 100
    const updateInfo = {
      name: 'Administrator',
      code: 'admin'
    }

    // Act
    const newRole = await roleRepository.updateRole(nonExistentId, updateINfo)

    // Assert
    expect(newRole).toBeNull()
  })
})