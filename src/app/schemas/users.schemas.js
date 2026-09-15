import { z } from 'zod'
import {
  createIdParamsSchema,
  newPasswordSchema,
  requireAtLeastOneField,
  usernameSchema
} from './common.schemas.js'

const userIdParamsSchema = createIdParamsSchema('userId')
const emailSchema = z.string().trim().toLowerCase().email().max(254)
const fullnameSchema = z.string().trim().min(1).max(100)
const phoneSchema = z.string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[0-9+(). -]+$/, { message: 'Invalid phone number' })

const createUserBodySchema = z.object({
  email: emailSchema,
  fullname: fullnameSchema,
  username: usernameSchema,
  phone: phoneSchema.nullable().optional(),
  password: newPasswordSchema
}).strict()

const updateUserBodySchema = requireAtLeastOneField(z.object({
  email: emailSchema.optional(),
  fullname: fullnameSchema.optional(),
  phone: phoneSchema.nullable().optional()
}).strict())

const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: newPasswordSchema
}).strict()

export default Object.freeze({
  getById: Object.freeze({ params: userIdParamsSchema }),
  create: Object.freeze({ body: createUserBodySchema }),
  update: Object.freeze({
    params: userIdParamsSchema,
    body: updateUserBodySchema
  }),
  deactivate: Object.freeze({ params: userIdParamsSchema }),
  changePassword: Object.freeze({
    params: userIdParamsSchema,
    body: changePasswordBodySchema
  })
})
