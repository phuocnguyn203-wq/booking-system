import { z } from 'zod'
import {
  createIdParamsSchema,
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

export default Object.freeze({
  getById: Object.freeze({ params: roomIdParamsSchema }),
  create: Object.freeze({ body: createRoomBodySchema }),
  update: Object.freeze({
    params: roomIdParamsSchema,
    body: updateRoomBodySchema
  }),
  deactivate: Object.freeze({ params: roomIdParamsSchema })
})
