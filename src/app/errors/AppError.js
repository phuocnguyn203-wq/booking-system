export default class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message)
    this.statusCode= statusCode
    this.code = code
  }
}

export function createAppError(error) {
  return new AppError(error.message, error.statusCode, error.code)
}

