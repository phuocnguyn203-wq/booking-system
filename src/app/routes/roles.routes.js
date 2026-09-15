import { Router } from 'express'
import createAuthorize from '../middleware/authorize.middleware.js'
import createValidate from '../middleware/validate.middleware.js'
import roleSchemas from '../schemas/roles.schemas.js'

export default function createRolesRouter({
  rolesController,
  authenticate
} = {}) {
  if (typeof authenticate !== 'function')
    throw new TypeError('rolesRouter requires authenticate middleware')

  const router = Router()
  const authorizeAdmin = createAuthorize('ADMIN')

  router.get(
    '/:roleId',
    authenticate,
    authorizeAdmin,
    createValidate(roleSchemas.getById),
    rolesController.getRoleById
  )

  router.post(
    '/',
    authenticate,
    authorizeAdmin,
    createValidate(roleSchemas.create),
    rolesController.createRole
  )

  router.patch(
    '/:roleId',
    authenticate,
    authorizeAdmin,
    createValidate(roleSchemas.update),
    rolesController.updateRole
  )

  router.delete(
    '/:roleId',
    authenticate,
    authorizeAdmin,
    createValidate(roleSchemas.deactivate),
    rolesController.deactivateRole
  )

  return router
}
