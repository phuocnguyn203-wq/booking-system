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
      code: testRole.role,
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

  it.each([
    [
      'code', 
      {
        name: 'Administrator',
        description: 'Manages the system'
      }
    ],
    [
      'name',
      {
        code: 'admin',
        description: 'Manages the system'
      }
    ]
  ])('throw AppError when not given %s', async (_, incompleteInfo, { roleRepository }) => {
    // Arrange

    // Act
    const rolePromise = roleRepository.create(incompleteInfo)

    // Assert
    await expect(rolePromise).rejects.toMatchObject({
      statusCode: 400,
      message: 'Required fields are mising'
    })
  })
})
