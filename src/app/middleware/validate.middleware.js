import createAppError from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'

const REQUEST_LOCATIONS = ['body', 'params', 'query']

function getConfiguredLocations(schemas) {
  if (schemas === null || typeof schemas !== 'object' || Array.isArray(schemas))
    throw new TypeError('validate requires a schema configuration object')

  const configuredKeys = Object.keys(schemas)
  const hasUnsupportedLocation = configuredKeys.some(
    location => !REQUEST_LOCATIONS.includes(location)
  )

  if (configuredKeys.length === 0 || hasUnsupportedLocation) {
    throw new TypeError(
      'validate requires at least one schema for body, params or query'
    )
  }

  const configuredLocations = REQUEST_LOCATIONS.filter(
    location => Object.hasOwn(schemas, location)
  )

  for (const location of configuredLocations) {
    if (typeof schemas[location]?.safeParseAsync !== 'function') {
      throw new TypeError(
        `${location} schema must provide a safeParseAsync function`
      )
    }
  }

  return configuredLocations
}

function normalizeIssues(location, result) {
  if (!Array.isArray(result?.error?.issues))
    throw new TypeError(`${location} schema returned an invalid result`)

  return result.error.issues.map(issue => ({
    location,
    path: Array.isArray(issue?.path) ? issue.path : [],
    message: typeof issue?.message === 'string'
      ? issue.message
      : 'Invalid value'
  }))
}

export default function createValidate(schemas) {
  const configuredLocations = getConfiguredLocations(schemas)

  return async function validate(req, res, next) {
    try {
      const results = await Promise.all(configuredLocations.map(
        async location => {
          const value = req[location] === undefined ? {} : req[location]
          const result = await schemas[location].safeParseAsync(value)

          return { location, result }
        }
      ))

      const details = results.flatMap(({ location, result }) => {
        if (result?.success === true)
          return []

        return normalizeIssues(location, result)
      })

      if (details.length > 0)
        return next(createAppError(Errors.VALIDATION_ERROR, details))

      const parsedValues = Object.fromEntries(results.map(
        ({ location, result }) => [location, result.data]
      ))

      // Commit parsed values only after every schema succeeds. This prevents a
      // later middleware from observing a request that was only partly validated.
      req.validated = {
        ...(req.validated ?? {}),
        ...parsedValues
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}
