export const Errors = {
  ROOM_ALREADY_EXISTS: {
    statusCode: 409,
    code: 'ROOM_ALREADY_EXISTS',
    message: 'Room already exists'
  },
  DATA_ACCESS_ERROR: {
    statusCode: 500,
    code: 'INTERNAL ERROR',
    message: 'Internal error'
  },
  NOT_NULL_VALIDATION: {
    statusCode: 400,
    code: 'NOT_NULL_VALIDATION',
    message: 'Required field is missing'
  },
  UNIQUE_VALIDATION: {
    statusCode: 409,
    code: 'UNIQUE_VALIDATION',
    message: 'An account with provided information already exists.'
  },
  EMAIL_VALIDATION: {
    statusCode: 400,
    code: 'EMAIL_VALIDATION',
    message: 'Email is not valid'
  },
  NO_VALID_FIELDS: {
    statusCode: 400,
    code: 'NO_VALID_FIELDS',
    message: 'Field names are not correct.'
  }
}