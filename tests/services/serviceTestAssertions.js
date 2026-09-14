import { expect } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'

export async function expectAppError(promise, expected) {
  const error = await promise.then(
    () => undefined,
    caughtError => caughtError
  )

  expect(error, 'Expected service operation to reject').toBeInstanceOf(AppError)
  expect(error).toMatchObject(expected)
  expect(error).not.toHaveProperty('statusCode')
}
