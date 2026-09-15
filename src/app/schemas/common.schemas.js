import { z } from 'zod'

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isCalendarDate(value) {
  if (!DATE_ONLY_PATTERN.test(value))
    return false

  const date = new Date(`${value}T00:00:00.000Z`)

  // Date accepts values such as February 30 and rolls them into March. The
  // round trip ensures the input represents a real calendar date.
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
}

export const positiveIdSchema = z.number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)

export const positiveIdParamSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)

export function createIdParamsSchema(field) {
  return z.object({ [field]: positiveIdParamSchema }).strict()
}

export const dateOnlySchema = z.string()
  .refine(isCalendarDate, { message: 'Expected a valid date in YYYY-MM-DD format' })

export const usernameSchema = z.string()
  .trim()
  .min(3)
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, {
    message: 'Username may contain only letters, numbers, underscores and hyphens'
  })

export const newPasswordSchema = z.string().min(8).max(128)

export const paginationQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}

export function requireAtLeastOneField(schema) {
  return schema.refine(value => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  })
}
