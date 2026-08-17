import AppError from "./AppError"

Errors = {
  ROOM_ALREADY_EXISTS: {
    statusCode: 409,
    code: 'ROOM_ALREADY_EXISTS',
    message: 'Room already exists'
  }
}

export function createAppError(error) {
  return new AppError(error.message, error.statusCode, error.code)
}