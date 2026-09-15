import { z } from 'zod'
import { positiveIdParamSchema } from './common.schemas.js'

const userRoleParamsSchema = z.object({
  userId: positiveIdParamSchema,
  roleId: positiveIdParamSchema
}).strict()

export default Object.freeze({
  changeAssignment: Object.freeze({ params: userRoleParamsSchema })
})
