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

describe('UserRoleRepository [updateUserRole]', () => {
  it('returns new role ids and replaces roles assigned to user', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const oldRoleIds = [(await createTestRole()).id, (await createTestRole()).id]
    const newRoleIds = [(await createTestRole()).id, (await createTestRole()).id]
    await createTestUserRoleWrapper({ userId: testUser.id, roleIds: oldRoleIds })

    // Act
    const roleIds = await userRoleRepository.updateUserRole(testUser.id, newRoleIds)

    // Assert
    expect(roleIds).toHaveLength(newRoleIds.length)
    expect(roleIds).toEqual(expect.arrayContaining(newRoleIds))
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    const roleIdsInDb = rowResult.rows.map(row => Number(row.role_id))
    expect(roleIdsInDb).toHaveLength(newRoleIds.length)
    expect(roleIdsInDb).toEqual(expect.arrayContaining(newRoleIds))
    expect(roleIdsInDb).not.toEqual(expect.arrayContaining(oldRoleIds))
  })

  it('returns empty list and removes all roles when given empty role ids', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const oldRoleIds = [(await createTestRole()).id, (await createTestRole()).id]
    await createTestUserRoleWrapper({ userId: testUser.id, roleIds: oldRoleIds })

    // Act
    const roleIds = await userRoleRepository.updateUserRole(testUser.id, [])

    // Assert
    expect(roleIds).toEqual([])
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows).toEqual([])
  })

  it('throws AppError and keeps old roles when given non-existent role id', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const oldRole = await createTestRole()
    const deletedRole = await createTestRole()
    await createTestUserRoleWrapper({ userId: testUser.id, roleIds: [oldRole.id] })
    await query(`DELETE FROM roles WHERE id=$1`, [deletedRole.id])

    // Act
    const rolePromise = userRoleRepository.updateUserRole(testUser.id, [deletedRole.id])

    // Assert
    await expect(rolePromise).rejects.toMatchObject({
      statusCode: 400,
      code: 'ROLE_NON_EXISTENT',
      message: 'Role does not exist'
    })
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows.map(row => Number(row.role_id))).toEqual([oldRole.id])
  })

  it('throws AppError and keeps old roles when given inactive role id', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const oldRole = await createTestRole()
    const inactiveRole = await createTestRole({ isActive: false })
    await createTestUserRoleWrapper({ userId: testUser.id, roleIds: [oldRole.id] })

    // Act
    const rolePromise = userRoleRepository.updateUserRole(testUser.id, [inactiveRole.id])

    // Assert
    await expect(rolePromise).rejects.toMatchObject({
      statusCode: 409,
      code: 'ROLE_INACTIVE',
      message: 'Cannot assign an inactive role'
    })
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows.map(row => Number(row.role_id))).toEqual([oldRole.id])
  })
})

describe('UserRoleRepository [deleteUserRole]', () => {
  it('returns true and deletes role assigned to user', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const deletedRole = await createTestRole()
    const remainingRole = await createTestRole()
    await createTestUserRoleWrapper({
      userId: testUser.id,
      roleIds: [deletedRole.id, remainingRole.id]
    })

    // Act
    const isDeleted = await userRoleRepository.deleteUserRole(testUser.id, deletedRole.id)

    // Assert
    expect(isDeleted).toBe(true)
    // Assert side effects
    const rowResult = await query(
      `SELECT role_id FROM user_roles WHERE user_id=$1`,
      [testUser.id]
    )
    expect(rowResult.rows.map(row => Number(row.role_id))).toEqual([remainingRole.id])
  })

  it('returns false when role is not assigned to user', async ({ userRoleRepository }) => {
    // Arrange
    const testUser = await createTestUser()
    const testRole = await createTestRole()

    // Act
    const isDeleted = await userRoleRepository.deleteUserRole(testUser.id, testRole.id)

    // Assert
    expect(isDeleted).toBe(false)
  })
})
