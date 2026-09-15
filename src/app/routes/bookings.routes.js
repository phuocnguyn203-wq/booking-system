import { Router } from 'express'
import createAuthorize from '../middleware/authorize.middleware.js'
import createValidate from '../middleware/validate.middleware.js'
import bookingSchemas from '../schemas/bookings.schemas.js'

export default function createBookingsRouter({
  bookingsController,
  authenticate
} = {}) {
  if (typeof authenticate !== 'function')
    throw new TypeError('bookingsRouter requires authenticate middleware')

  const router = Router()
  const authorizeStaff = createAuthorize('ADMIN', 'MANAGER')
  const authorizeCustomer = createAuthorize('CUSTOMER')

  router.get(
    '/me',
    authenticate,
    authorizeCustomer,
    createValidate(bookingSchemas.listCurrent),
    bookingsController.listCurrentUserBookings
  )

  router.get(
    '/me/:bookingId',
    authenticate,
    authorizeCustomer,
    createValidate(bookingSchemas.getCurrentById),
    bookingsController.getCurrentUserBooking
  )

  router.delete(
    '/me/:bookingId',
    authenticate,
    authorizeCustomer,
    createValidate(bookingSchemas.cancelCurrent),
    bookingsController.cancelCurrentUserBooking
  )

  router.post(
    '/',
    authenticate,
    authorizeCustomer,
    createValidate(bookingSchemas.create),
    bookingsController.createBooking
  )

  router.get(
    '/:bookingId',
    authenticate,
    authorizeStaff,
    createValidate(bookingSchemas.getById),
    bookingsController.getBookingById
  )

  router.patch(
    '/:bookingId',
    authenticate,
    authorizeStaff,
    createValidate(bookingSchemas.update),
    bookingsController.updateBooking
  )

  router.delete(
    '/:bookingId',
    authenticate,
    authorizeStaff,
    createValidate(bookingSchemas.deactivate),
    bookingsController.deactivateBooking
  )

  return router
}
