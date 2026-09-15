import { z } from 'zod'
import {
  createIdParamsSchema,
  dateOnlySchema,
  paginationQueryShape,
  positiveIdSchema,
  requireAtLeastOneField
} from './common.schemas.js'

const bookingIdParamsSchema = createIdParamsSchema('bookingId')
const paginationQuerySchema = z.object(paginationQueryShape).strict()
const bookingStatusSchema = z.enum(['pending', 'confirmed', 'cancelled'])

function hasValidDateOrder(value) {
  if (value.checkInDate === undefined || value.checkOutDate === undefined)
    return true

  return value.checkOutDate > value.checkInDate
}

const createBookingBodySchema = z.object({
  roomId: positiveIdSchema,
  checkInDate: dateOnlySchema,
  checkOutDate: dateOnlySchema
}).strict().refine(hasValidDateOrder, {
  path: ['checkOutDate'],
  message: 'Check-out date must be after check-in date'
})

const updateBookingBodySchema = requireAtLeastOneField(z.object({
  checkInDate: dateOnlySchema.optional(),
  checkOutDate: dateOnlySchema.optional(),
  status: bookingStatusSchema.optional()
}).strict()).refine(hasValidDateOrder, {
  path: ['checkOutDate'],
  message: 'Check-out date must be after check-in date'
})

export default Object.freeze({
  listCurrent: Object.freeze({ query: paginationQuerySchema }),
  getCurrentById: Object.freeze({ params: bookingIdParamsSchema }),
  cancelCurrent: Object.freeze({ params: bookingIdParamsSchema }),
  getById: Object.freeze({ params: bookingIdParamsSchema }),
  create: Object.freeze({ body: createBookingBodySchema }),
  update: Object.freeze({
    params: bookingIdParamsSchema,
    body: updateBookingBodySchema
  }),
  deactivate: Object.freeze({ params: bookingIdParamsSchema })
})
