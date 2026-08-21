const Errors = {
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
  },
  INVALID_DATE: {
    statusCode: 400,
    code: 'INVALID_DATE',
    message: 'Check out date can\'t be earlier than check in date'
  },
  INVALID_STATE: {
    statusCOde: 400,
    code: 'INVALID_STATE',
    message: 'State must be either pending or completed or cancelled'
  },
  ROOM_NON_EXISTENT: {
    statusCode: 400,
    code: 'ROOM_NON_EXISTENT',
    message: 'Room does not exist'
  },
  USER_NON_EXISTENT: {
    statusCode: 400,
    code: 'USER_NON_EXISTENT',
    message: 'User does not exist'
  }
}

export default Errors
