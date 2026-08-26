import {describe, it as baseIt, expect} from 'vitest'
import { cleanBeforeEachAndAfterAll, createTestUser, createTestRole, createTestUserRoleWrapper } from './testHelper.js'
import UserRoleRepository from '../../src/app/repositories/userRoles.repository.js'
import { query } from '../../src/database/index.js'

const it = baseIt.extend('userRoleRepository', () => {
  return new UserRoleRepository(query)
})

cleanBeforeEachAndAfterAll()

describe('UserRoleRepository [findUserRoleById]', () => {
  it('returns list of role ids when given user id', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const roleTestIds = [(await createTestRole()).id, (await createTestRole()).id]

    await createTestUserRoleWrapper({ userId: testUser.id, roleIds: roleTestIds })

    // Act
    const roleIds = await userRoleRepository.findUserRoleById(testUser.id)

    // Assert
    expect(roleIds).toHaveLength(roleTestIds.length)
    expect(roleIds).toEqual(expect.arrayContaining(roleTestIds))
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows.map(row => row.role_id)).toEqual(expect.arrayContaining(roleIds))
  })

  it('returns empty list when given deletedUser', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser({ isDeleted: true })
    const roleTestIds = [(await createTestRole()).id, (await createTestRole()).id]
    await createTestUserRoleWrapper({ userId: testUser.id, roleIds: roleTestIds })

    // Act
    const roleIds = await userRoleRepository.findUserRoleById(testUser.id)

    // Assert
    expect(roleIds).toEqual([])
  })

  it('returns empty list when user has no roles', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()

    // Act
    const roleIds = await userRoleRepository.findUserRoleById(testUser.id)

    // Assert
    expect(roleIds).toEqual([])
  })

  it('does not return inactive role ids', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const activeRole = await createTestRole()
    const inactiveRole = await createTestRole({ isActive: false })
    await createTestUserRoleWrapper({
      userId: testUser.id,
      roleIds: [activeRole.id, inactiveRole.id]
    })

    // Act
    const roleIds = await userRoleRepository.findUserRoleById(testUser.id)

    // Assert
    expect(roleIds).toEqual([activeRole.id])
  })

  it('returns empty list when given non-existent userId', async ({ userRoleRepository }) => {
    // Arrange
    const nonExistentUserId = 100

    // Act
    const roleIds = await userRoleRepository.findUserRoleById(nonExistentUserId)

    // Assert
    expect(roleIds).toEqual([])
  })


})

describe('UserRoleRepository [createUserRole]', () => {
  it('returns role ids and assigns roles to user', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const roleTestIds = [(await createTestRole()).id, (await createTestRole()).id]

    // Act
    const roleIds = await userRoleRepository.createUserRole(testUser.id, roleTestIds)

    // Assert
    expect(roleIds).toHaveLength(roleTestIds.length)
    expect(roleIds).toEqual(expect.arrayContaining(roleTestIds))
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    const roleIdsInDb = rowResult.rows.map(row => Number(row.role_id))
    expect(roleIdsInDb).toHaveLength(roleTestIds.length)
    expect(roleIdsInDb).toEqual(expect.arrayContaining(roleTestIds))
  })

  it('returns empty list and does not assign roles when given empty role ids', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()

    // Act
    const roleIds = await userRoleRepository.createUserRole(testUser.id, [])

    // Assert
    expect(roleIds).toEqual([])
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows).toEqual([])
  })

  it('throws AppError and does not assign roles when user is suspended', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser({ status: 'suspended' })
    const testRole = await createTestRole()

    // Act
    const rolePromise = userRoleRepository.createUserRole(testUser.id, [testRole.id])

    // Assert
    await expect(rolePromise).rejects.toMatchObject({
      statusCode: 409,
      code: 'USER_SUSPENDED',
      message: 'Cannot assign roles to a suspended user'
    })
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows).toEqual([])
  })

  it('throws AppError and does not assign roles when user is deleted', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser({ isDeleted: true })
    const testRole = await createTestRole()

    // Act
    const rolePromise = userRoleRepository.createUserRole(testUser.id, [testRole.id])

    // Assert
    await expect(rolePromise).rejects.toMatchObject({
      statusCode: 400,
      code: 'USER_NON_EXISTENT',
      message: 'User does not exist'
    })
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows).toEqual([])
  })
})
