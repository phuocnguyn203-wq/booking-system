import createAppError from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'

export default function notFound(req, res, next) {
  return next(createAppError(Errors.ROUTE_NOT_FOUND))
}
