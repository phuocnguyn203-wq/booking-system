import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import createValidate from '../../src/app/middleware/validate.middleware.js'

function createSchema(result) {
  // Mock the schema's public contract so these middleware tests do not depend
  // on a concrete validation package or duplicate individual schema rules.
  return {
    safeParseAsync: vi.fn().mockResolvedValue(result)
  }
}

function createResponse() {
  return {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
}

function expectResponseUntouched(res) {
  expect(res.status).not.toHaveBeenCalled()
  expect(res.json).not.toHaveBeenCalled()
  expect(res.send).not.toHaveBeenCalled()
}

let res
let next

beforeEach(() => {
  res = createResponse()
  next = vi.fn()
})

describe('validate middleware [valid request]', () => {
  it('validates body, params and query and stores their parsed values', async () => {
    // Arrange
    const body = { email: ' USER@EXAMPLE.COM ' }
    const params = { userId: '42' }
    const query = { page: '2' }
    const parsedBody = { email: 'user@example.com' }
    const parsedParams = { userId: 42 }
    const parsedQuery = { page: 2 }
    const bodySchema = createSchema({ success: true, data: parsedBody })
    const paramsSchema = createSchema({ success: true, data: parsedParams })
    const querySchema = createSchema({ success: true, data: parsedQuery })
    const validate = createValidate({
      body: bodySchema,
      params: paramsSchema,
      query: querySchema
    })
    const req = { body, params, query }

    // Act
    await validate(req, res, next)

    // Assert
    expect(bodySchema.safeParseAsync).toHaveBeenCalledExactlyOnceWith(body)
    expect(paramsSchema.safeParseAsync).toHaveBeenCalledExactlyOnceWith(params)
    expect(querySchema.safeParseAsync).toHaveBeenCalledExactlyOnceWith(query)

    // Express 5 exposes req.query through a getter. Keeping parsed input in a
    // separate namespace also lets downstream code distinguish it from raw input.
    expect(req.validated).toEqual({
      body: parsedBody,
      params: parsedParams,
      query: parsedQuery
    })
    expect(next).toHaveBeenCalledExactlyOnceWith()
    expectResponseUntouched(res)
  })

  it('validates only the configured request locations', async () => {
    // Arrange
    const parsedBody = { username: 'test-user' }
    const bodySchema = createSchema({ success: true, data: parsedBody })
    const validate = createValidate({ body: bodySchema })
    const req = {
      body: { username: 'test-user' },
      params: { ignored: 'param' },
      query: { ignored: 'query' }
    }

    // Act
    await validate(req, res, next)

    // Assert
    expect(req.validated).toEqual({ body: parsedBody })
    expect(next).toHaveBeenCalledExactlyOnceWith()
    expectResponseUntouched(res)
  })

  it('uses an empty object when a configured request location is missing', async () => {
    // Arrange
    const bodySchema = createSchema({ success: true, data: {} })
    const validate = createValidate({ body: bodySchema })
    const req = {}

    // Act
    await validate(req, res, next)

    // Assert
    expect(bodySchema.safeParseAsync).toHaveBeenCalledExactlyOnceWith({})
    expect(req.validated).toEqual({ body: {} })
    expect(next).toHaveBeenCalledExactlyOnceWith()
  })

  it('preserves values validated by an earlier middleware', async () => {
    // Arrange
    const querySchema = createSchema({
      success: true,
      data: { page: 2 }
    })
    const validate = createValidate({ query: querySchema })
    const req = {
      query: { page: '2' },
      validated: { params: { userId: 42 } }
    }

    // Act
    await validate(req, res, next)

    // Assert
    expect(req.validated).toEqual({
      params: { userId: 42 },
      query: { page: 2 }
    })
    expect(next).toHaveBeenCalledExactlyOnceWith()
  })
})

describe('validate middleware [invalid request]', () => {
  it('forwards normalized validation details without changing the request', async () => {
    // Arrange
    const bodySchema = createSchema({
      success: false,
      error: {
        issues: [
          {
            code: 'invalid_format',
            path: ['email'],
            message: 'Invalid email address'
          }
        ]
      }
    })
    const paramsSchema = createSchema({
      success: false,
      error: {
        issues: [
          {
            code: 'too_small',
            path: ['userId'],
            message: 'Expected a positive integer'
          }
        ]
      }
    })
    const validate = createValidate({
      body: bodySchema,
      params: paramsSchema
    })
    const existingValidated = { query: { page: 1 } }
    const req = {
      body: { email: 'invalid' },
      params: { userId: '0' },
      validated: existingValidated
    }

    // Act
    await validate(req, res, next)

    // Assert
    // Validation is atomic across locations: one failure must prevent every
    // partially parsed value from becoming visible to downstream middleware.
    expect(req.validated).toBe(existingValidated)
    expect(next).toHaveBeenCalledOnce()

    const error = next.mock.calls[0][0]
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [
        {
          location: 'body',
          path: ['email'],
          message: 'Invalid email address'
        },
        {
          location: 'params',
          path: ['userId'],
          message: 'Expected a positive integer'
        }
      ]
    })
    expect(error).not.toHaveProperty('statusCode')
    expectResponseUntouched(res)
  })
})

describe('validate middleware [schema failures]', () => {
  it('forwards an unexpected schema error unchanged', async () => {
    // Arrange
    const error = new TypeError('Schema unavailable')
    const bodySchema = {
      safeParseAsync: vi.fn().mockRejectedValue(error)
    }
    const validate = createValidate({ body: bodySchema })
    const req = { body: {} }

    // Act
    await validate(req, res, next)

    // Assert
    // A schema execution failure is an application fault, not bad client input,
    // so the centralized error handler must receive the original error object.
    expect(req.validated).toBeUndefined()
    expect(next).toHaveBeenCalledExactlyOnceWith(error)
    expectResponseUntouched(res)
  })
})

describe('validate middleware [configuration]', () => {
  it.each([
    { label: 'configuration is missing', schemas: undefined },
    { label: 'configuration is empty', schemas: {} },
    { label: 'location is unsupported', schemas: { headers: createSchema({}) } },
    { label: 'schema is missing safeParseAsync', schemas: { body: {} } }
  ])('rejects invalid configuration when $label', ({ schemas }) => {
    expect(() => createValidate(schemas)).toThrow(TypeError)
  })
})
