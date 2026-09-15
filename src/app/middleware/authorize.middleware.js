import createAppError from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'

export default function createAuthorize(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some(role => typeof role !== 'string' || role.length === 0)
  ) {
    throw new TypeError('authorize requires at least one valid role')
  }

  return function authorize(req, res, next) {
    if (req.user === null || req.user === undefined)
      return next(createAppError(Errors.AUTHENTICATION_REQUIRED))

    const userRoles = req.user.roles
    const isAllowed = Array.isArray(userRoles) &&
      userRoles.some(role => allowedRoles.includes(role))

    if (!isAllowed)
      return next(createAppError(Errors.FORBIDDEN))

    return next()
  }
}
