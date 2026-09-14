import { expect } from 'vitest'

/**
 * Repository failures describe persistence problems only. They deliberately do
 * not contain an HTTP status; mapping one of these errors to 400/409/500 is the
 * responsibility of the controller or other transport layer.
 */
export async function expectRepositoryError(promise, expected) {
  const error = await promise.then(
    () => undefined,
    caughtError => caughtError
  )

  expect(error, 'Expected repository operation to reject').toBeInstanceOf(Error)
  expect(error).toMatchObject({
    name: 'RepositoryError',
    ...expected
  })
  expect(error).not.toHaveProperty('statusCode')
}
