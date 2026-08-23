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
