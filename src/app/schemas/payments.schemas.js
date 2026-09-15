import { z } from 'zod'
import {
  createIdParamsSchema,
  positiveIdSchema
} from './common.schemas.js'

const paymentIdParamsSchema = createIdParamsSchema('paymentId')
const amountSchema = z.string()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, {
    message: 'Amount must have at most ten integer and two decimal digits'
  })
  .refine(value => Number(value) > 0, { message: 'Amount must be positive' })

const optionalProviderValue = z.string().trim().min(1).max(255)
  .nullable()
  .optional()

const createPaymentBodySchema = z.object({
  bookingId: positiveIdSchema,
  // Money remains a decimal string so parsing never introduces floating-point
  // rounding before PostgreSQL stores it as NUMERIC(12, 2).
  amount: amountSchema,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  method: z.enum(['cash', 'card', 'bank_transfer', 'e_wallet']),
  provider: optionalProviderValue,
  providerTransactionId: optionalProviderValue,
  idempotencyKey: z.string().trim().min(1).max(128)
}).strict()

export default Object.freeze({
  getById: Object.freeze({ params: paymentIdParamsSchema }),
  create: Object.freeze({ body: createPaymentBodySchema })
})
