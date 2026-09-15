const Errors = {
  DATA_ACCESS_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal error'
  },
  AUTHENTICATION_REQUIRED: {
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Bearer access token is required'
  },
  INVALID_ACCESS_TOKEN: {
    code: 'INVALID_ACCESS_TOKEN',
    message: 'Access token is invalid or expired'
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action'
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed'
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Username or password is incorrect'
  },
  ACCOUNT_NOT_ACTIVE: {
    code: 'ACCOUNT_NOT_ACTIVE',
    message: 'User account is not active'
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User does not exist'
  },
  USER_SUSPENDED: {
    code: 'USER_SUSPENDED',
    message: 'Suspended user cannot be assigned a role'
  },
  ROLE_NOT_FOUND: {
    code: 'ROLE_NOT_FOUND',
    message: 'Role does not exist'
  },
  ROLE_INACTIVE: {
    code: 'ROLE_INACTIVE',
    message: 'Inactive role cannot be assigned'
  },
  ROLE_ALREADY_ASSIGNED: {
    code: 'ROLE_ALREADY_ASSIGNED',
    message: 'Role is already assigned to user'
  },
  ROLE_CODE_ALREADY_EXISTS: {
    code: 'ROLE_CODE_ALREADY_EXISTS',
    message: 'Role code already exists'
  },
  ROOM_NOT_FOUND: {
    code: 'ROOM_NOT_FOUND',
    message: 'Room does not exist'
  },
  ROOM_TYPE_NOT_FOUND: {
    code: 'ROOM_TYPE_NOT_FOUND',
    message: 'Room type does not exist'
  },
  ROOM_NUMBER_ALREADY_EXISTS: {
    code: 'ROOM_NUMBER_ALREADY_EXISTS',
    message: 'Room number already exists'
  },
  INVALID_ROOM_DATA: {
    code: 'INVALID_ROOM_DATA',
    message: 'Room data is invalid'
  },
  NO_ROOM_FIELDS_TO_UPDATE: {
    code: 'NO_ROOM_FIELDS_TO_UPDATE',
    message: 'No room fields can be updated'
  },
  PAYMENT_NOT_FOUND: {
    code: 'PAYMENT_NOT_FOUND',
    message: 'Payment does not exist'
  },
  BOOKING_NOT_FOUND: {
    code: 'BOOKING_NOT_FOUND',
    message: 'Booking does not exist'
  },
  INVALID_BOOKING_DATA: {
    code: 'INVALID_BOOKING_DATA',
    message: 'Booking data is invalid'
  },
  NO_BOOKING_FIELDS_TO_UPDATE: {
    code: 'NO_BOOKING_FIELDS_TO_UPDATE',
    message: 'No booking fields can be updated'
  },
  BOOKING_DATES_OVERLAP: {
    code: 'BOOKING_DATES_OVERLAP',
    message: 'Booking dates overlap with an active booking'
  },
  PAYMENT_REQUEST_ALREADY_EXISTS: {
    code: 'PAYMENT_REQUEST_ALREADY_EXISTS',
    message: 'Payment request already exists'
  },
  PAYMENT_TRANSACTION_ALREADY_EXISTS: {
    code: 'PAYMENT_TRANSACTION_ALREADY_EXISTS',
    message: 'Payment transaction already exists'
  },
  INVALID_PAYMENT_DATA: {
    code: 'INVALID_PAYMENT_DATA',
    message: 'Payment data is invalid'
  },
  NO_ROLE_FIELDS_TO_UPDATE: {
    code: 'NO_ROLE_FIELDS_TO_UPDATE',
    message: 'No role fields can be updated'
  },
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Email already exists'
  },
  USERNAME_ALREADY_EXISTS: {
    code: 'USERNAME_ALREADY_EXISTS',
    message: 'Username already exists'
  },
  INVALID_USER_DATA: {
    code: 'INVALID_USER_DATA',
    message: 'User data is invalid'
  },
  NO_USER_FIELDS_TO_UPDATE: {
    code: 'NO_USER_FIELDS_TO_UPDATE',
    message: 'No user fields can be updated'
  },
  INVALID_CURRENT_PASSWORD: {
    code: 'INVALID_CURRENT_PASSWORD',
    message: 'Current password is incorrect'
  },
  PASSWORD_REUSE_NOT_ALLOWED: {
    code: 'PASSWORD_REUSE_NOT_ALLOWED',
    message: 'New password must be different from current password'
  }
}

export default Errors
