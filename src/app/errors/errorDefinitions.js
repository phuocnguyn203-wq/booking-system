const Errors = {
  DATA_ACCESS_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal error'
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
