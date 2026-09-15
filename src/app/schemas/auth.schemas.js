import { z } from 'zod'
import { usernameSchema } from './common.schemas.js'

const loginBodySchema = z.object({
  username: usernameSchema,
  // Login accepts existing passwords under the current storage policy. New
  // password strength is enforced only when creating or changing a password.
  password: z.string().min(1).max(128)
}).strict()

export default Object.freeze({
  login: Object.freeze({ body: loginBodySchema })
})
