const Errors = {
  DATA_ACCESS_ERROR: {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal error'
  },
  USER_NOT_FOUND: {
    statusCode: 404,
    code: 'USER_NOT_FOUND',
    message: 'User does not exist'
  },
  USER_SUSPENDED: {
    statusCode: 403,
    code: 'USER_SUSPENDED',
    message: 'Suspended user cannot be assigned a role'
  },
  ROLE_NOT_FOUND: {
    statusCode: 404,
    code: 'ROLE_NOT_FOUND',
    message: 'Role does not exist'
  },
  ROLE_INACTIVE: {
    statusCode: 409,
    code: 'ROLE_INACTIVE',
    message: 'Inactive role cannot be assigned'
  },
  ROLE_ALREADY_ASSIGNED: {
    statusCode: 409,
    code: 'ROLE_ALREADY_ASSIGNED',
    message: 'Role is already assigned to user'
  },
  ROLE_CODE_ALREADY_EXISTS: {
    statusCode: 409,
    code: 'ROLE_CODE_ALREADY_EXISTS',
    message: 'Role code already exists'
  },
  NO_ROLE_FIELDS_TO_UPDATE: {
    statusCode: 400,
    code: 'NO_ROLE_FIELDS_TO_UPDATE',
    message: 'No role fields can be updated'
  },
  EMAIL_ALREADY_EXISTS: {
    statusCode: 409,
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Email already exists'
  },
  USERNAME_ALREADY_EXISTS: {
    statusCode: 409,
    code: 'USERNAME_ALREADY_EXISTS',
    message: 'Username already exists'
  },
  INVALID_USER_DATA: {
    statusCode: 400,
    code: 'INVALID_USER_DATA',
    message: 'User data is invalid'
  },
  NO_USER_FIELDS_TO_UPDATE: {
    statusCode: 400,
    code: 'NO_USER_FIELDS_TO_UPDATE',
    message: 'No user fields can be updated'
  },
  INVALID_CURRENT_PASSWORD: {
    statusCode: 401,
    code: 'INVALID_CURRENT_PASSWORD',
    message: 'Current password is incorrect'
  },
  PASSWORD_REUSE_NOT_ALLOWED: {
    statusCode: 400,
    code: 'PASSWORD_REUSE_NOT_ALLOWED',
    message: 'New password must be different from current password'
  }
}

export default Errors
