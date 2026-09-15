import { Router } from 'express'
import createAuthorize from '../middleware/authorize.middleware.js'
import createValidate from '../middleware/validate.middleware.js'
import paymentSchemas from '../schemas/payments.schemas.js'

export default function createPaymentsRouter({
  paymentsController,
  authenticate
} = {}) {
  if (typeof authenticate !== 'function')
    throw new TypeError('paymentsRouter requires authenticate middleware')

  const router = Router()
  const authorizeStaff = createAuthorize('ADMIN', 'MANAGER')
  const authorizeCustomer = createAuthorize('CUSTOMER')

  router.get(
    '/me',
    authenticate,
    authorizeCustomer,
    createValidate(paymentSchemas.listCurrent),
    paymentsController.listCurrentUserPayments
  )

  router.get(
    '/me/:paymentId',
    authenticate,
    authorizeCustomer,
    createValidate(paymentSchemas.getCurrentById),
    paymentsController.getCurrentUserPayment
  )

  router.post(
    '/me',
    authenticate,
    authorizeCustomer,
    createValidate(paymentSchemas.createCurrent),
    paymentsController.createCurrentUserPayment
  )

  router.get(
    '/:paymentId',
    authenticate,
    authorizeStaff,
    createValidate(paymentSchemas.getById),
    paymentsController.getPaymentById
  )

  router.post(
    '/',
    authenticate,
    authorizeStaff,
    createValidate(paymentSchemas.create),
    paymentsController.createPayment
  )

  return router
}
