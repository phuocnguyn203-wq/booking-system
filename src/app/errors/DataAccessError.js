class DataAccessError extends Error {
  constructor(message, statusCode, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export function createDataAccessError(error) {
  return new DataAccessError(error.message, error.statusCode, error.code)
}