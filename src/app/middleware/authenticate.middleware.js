import createAppError from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'

function extractBearerToken(authorization) {
  if (typeof authorization !== 'string')
    return null

  const match = authorization.match(/^Bearer\s+(\S+)$/i)
  return match?.[1] ?? null
}

export default function createAuthenticate({ authService }) {
  return async function authenticate(req, res, next) {
    try {
      const token = extractBearerToken(req.headers?.authorization)

      if (token === null)
        throw createAppError(Errors.AUTHENTICATION_REQUIRED)

      const authenticatedUser = await authService.verifyAccessToken(token)

      if (authenticatedUser === null || authenticatedUser === undefined)
        throw createAppError(Errors.INVALID_ACCESS_TOKEN)

      req.user = authenticatedUser
      return next()
    } catch (error) {
      return next(error)
    }
  }
}
