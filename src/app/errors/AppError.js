export class AppError extends Error {
  constructor(message, code, details) {
    super(message)
    this.name = 'AppError'
    this.code = code

    if (details !== undefined)
      this.details = details
  }
}

export default function createAppError(error, details) {
  return new AppError(error.message, error.code, details)
}

