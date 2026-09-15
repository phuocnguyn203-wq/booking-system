import { Router } from 'express'
import createValidate from '../middleware/validate.middleware.js'
import authSchemas from '../schemas/auth.schemas.js'

export default function createAuthRouter({ authController } = {}) {
  if (typeof authController?.login !== 'function')
    throw new TypeError('authRouter requires an authController with login')

  const router = Router()

  router.post(
    '/login',
    createValidate(authSchemas.login),
    authController.login
  )

  return router
}
