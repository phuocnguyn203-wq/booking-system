import { z } from 'zod'
import {
  createIdParamsSchema,
  requireAtLeastOneField
} from './common.schemas.js'

const roleIdParamsSchema = createIdParamsSchema('roleId')
const roleNameSchema = z.string().trim().min(1).max(100)
const roleDescriptionSchema = z.string().trim().max(500).nullable()

const createRoleBodySchema = z.object({
  code: z.string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/, {
      message: 'Role code must use uppercase letters, numbers and underscores'
    }),
  name: roleNameSchema,
  description: roleDescriptionSchema.optional()
}).strict()

const updateRoleBodySchema = requireAtLeastOneField(z.object({
  name: roleNameSchema.optional(),
  description: roleDescriptionSchema.optional()
}).strict())

export default Object.freeze({
  getById: Object.freeze({ params: roleIdParamsSchema }),
  create: Object.freeze({ body: createRoleBodySchema }),
  update: Object.freeze({
    params: roleIdParamsSchema,
    body: updateRoleBodySchema
  }),
  deactivate: Object.freeze({ params: roleIdParamsSchema })
})
