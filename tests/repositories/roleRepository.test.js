import { describe, it as baseIt, expect } from 'vitest'
import { cleanBeforeEachAndAfterAll, createTestRole } from './testHelper'
import RoleRepository from '../../src/app/repositories/roles.repository.js'
import { query } from '../../src/database/index.js'

const it = baseIt.extend('roleRepository', () => {
  return new RoleRepository(query)
})

await cleanBeforeEachAndAfterAll()
