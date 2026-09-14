export class AppError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export default function createAppError(error) {
  return new AppError(error.message, error.code)
}

