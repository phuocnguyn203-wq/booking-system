import {describe, it as baseIt, expect} from 'vitest'
import { cleanBeforeEachAndAfterAll, createTestUser, createTestRole } from './testHelper.js'
import UserRoleRepository from '../../src/app/repositories/userRoles.repository.js'
import { query } from '../../src/database/index.js'

const it = baseIt.extend('testRoleRepository', () => {
  return new UserRoleRepository(query)
})

cleanBeforeEachAndAfterAll()
