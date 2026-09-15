import { Router } from 'express'
import createAuthorize from '../middleware/authorize.middleware.js'
import createValidate from '../middleware/validate.middleware.js'
import userRoleSchemas from '../schemas/userRoles.schemas.js'

export default function createUserRolesRouter({
  userRolesController,
  authenticate
} = {}) {
  if (typeof authenticate !== 'function')
    throw new TypeError('userRolesRouter requires authenticate middleware')

  const router = Router()
  const authorizeAdmin = createAuthorize('ADMIN')
  const validateAssignment = createValidate(userRoleSchemas.changeAssignment)

  router.post(
    '/:userId/roles/:roleId',
    authenticate,
    authorizeAdmin,
    validateAssignment,
    userRolesController.addUserRole
  )

  router.delete(
    '/:userId/roles/:roleId',
    authenticate,
    authorizeAdmin,
    validateAssignment,
    userRolesController.removeUserRole
  )

  return router
}
