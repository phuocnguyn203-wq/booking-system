import { z } from 'zod'
import {
  createIdParamsSchema,
  dateOnlySchema,
  paginationQueryShape,
  positiveIdSchema,
  requireAtLeastOneField
} from './common.schemas.js'

const roomIdParamsSchema = createIdParamsSchema('roomId')
const roomNumberSchema = z.string().trim().min(1).max(20)
const floorSchema = z.number().int().nullable()
const roomStatusSchema = z.enum([
  'active',
  'maintenance',
  'out_of_service'
])

const createRoomBodySchema = z.object({
  roomNumber: roomNumberSchema,
  roomTypeId: positiveIdSchema,
  floor: floorSchema.optional(),
  status: roomStatusSchema.optional()
}).strict()

const updateRoomBodySchema = requireAtLeastOneField(z.object({
  roomNumber: roomNumberSchema.optional(),
  roomTypeId: positiveIdSchema.optional(),
  floor: floorSchema.optional(),
  status: roomStatusSchema.optional()
}).strict())

const availableRoomsQuerySchema = z.object({
  ...paginationQueryShape,
  checkInDate: dateOnlySchema.optional(),
  checkOutDate: dateOnlySchema.optional(),
  capacity: z.coerce.number().int().positive().optional()
}).strict().refine(value => {
  return (value.checkInDate === undefined) ===
    (value.checkOutDate === undefined)
}, {
  path: ['checkOutDate'],
  message: 'Check-in and check-out dates must be provided together'
}).refine(value => {
  if (value.checkInDate === undefined)
    return true

  return value.checkOutDate > value.checkInDate
}, {
  path: ['checkOutDate'],
  message: 'Check-out date must be after check-in date'
})

export default Object.freeze({
  listAvailable: Object.freeze({ query: availableRoomsQuerySchema }),
  getById: Object.freeze({ params: roomIdParamsSchema }),
  create: Object.freeze({ body: createRoomBodySchema }),
  update: Object.freeze({
    params: roomIdParamsSchema,
    body: updateRoomBodySchema
  }),
  deactivate: Object.freeze({ params: roomIdParamsSchema })
})
