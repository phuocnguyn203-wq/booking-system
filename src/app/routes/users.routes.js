import { Router } from 'express'
import createAuthorize from '../middleware/authorize.middleware.js'
import createValidate from '../middleware/validate.middleware.js'
import userSchemas from '../schemas/users.schemas.js'

export default function createUsersRouter({
  usersController,
  authenticate
} = {}) {
  if (typeof authenticate !== 'function')
    throw new TypeError('usersRouter requires authenticate middleware')

  const router = Router()

  router.post(
    '/',
    createValidate(userSchemas.create),
    usersController.createUser
  )

  router.get(
    '/me',
    authenticate,
    usersController.getCurrentUser
  )

  router.patch(
    '/me',
    authenticate,
    createValidate(userSchemas.updateCurrent),
    usersController.updateCurrentUser
  )

  // Self-service password changes derive identity from the verified token;
  // accepting a user id here would allow callers to target another account.
  router.patch(
    '/me/password',
    authenticate,
    createValidate(userSchemas.changePassword),
    usersController.changePassword
  )

  router.get(
    '/:userId',
    authenticate,
    createAuthorize('ADMIN', 'MANAGER'),
    createValidate(userSchemas.getById),
    usersController.getUserById
  )

  router.patch(
    '/:userId',
    authenticate,
    createAuthorize('ADMIN'),
    createValidate(userSchemas.update),
    usersController.updateUser
  )

  router.delete(
    '/:userId',
    authenticate,
    createAuthorize('ADMIN'),
    createValidate(userSchemas.deactivate),
    usersController.deactivateUser
  )

  return router
}
