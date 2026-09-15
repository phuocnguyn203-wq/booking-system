import { Router } from 'express'
import createAuthorize from '../middleware/authorize.middleware.js'
import createValidate from '../middleware/validate.middleware.js'
import roomSchemas from '../schemas/rooms.schemas.js'

export default function createRoomsRouter({
  roomsController,
  authenticate
} = {}) {
  if (typeof authenticate !== 'function')
    throw new TypeError('roomsRouter requires authenticate middleware')

  const router = Router()
  const authorizeStaff = createAuthorize('ADMIN', 'MANAGER')

  router.get(
    '/',
    authenticate,
    createAuthorize('ADMIN', 'MANAGER', 'CUSTOMER'),
    createValidate(roomSchemas.listAvailable),
    roomsController.listAvailableRooms
  )

  router.get(
    '/:roomId',
    authenticate,
    createAuthorize('ADMIN', 'MANAGER', 'CUSTOMER'),
    createValidate(roomSchemas.getById),
    roomsController.getRoomById
  )

  router.post(
    '/',
    authenticate,
    authorizeStaff,
    createValidate(roomSchemas.create),
    roomsController.createRoom
  )

  router.patch(
    '/:roomId',
    authenticate,
    authorizeStaff,
    createValidate(roomSchemas.update),
    roomsController.updateRoom
  )

  router.delete(
    '/:roomId',
    authenticate,
    authorizeStaff,
    createValidate(roomSchemas.deactivate),
    roomsController.deactivateRoom
  )

  return router
}
