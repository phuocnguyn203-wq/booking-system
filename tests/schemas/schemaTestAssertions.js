import { expect } from 'vitest'

export async function expectValid(schema, input, expected = input) {
  const result = await schema.safeParseAsync(input)

  expect(result.success).toBe(true)
  expect(result.data).toEqual(expected)
}

export async function expectInvalid(schema, input) {
  const result = await schema.safeParseAsync(input)

  expect(result.success).toBe(false)
  expect(result.error.issues.length).toBeGreaterThan(0)
}
