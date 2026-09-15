const INVALID_TOKEN_ERROR_NAMES = new Set([
  'TokenExpiredError',
  'JsonWebTokenError',
  'NotBeforeError'
])

function requireFunction(value, name) {
  if (typeof value !== 'function')
    throw new TypeError(`${name} must be a function`)
}

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new TypeError(`${name} must be a non-empty string`)
}

function requireTokenLifetime(value) {
  const isNonEmptyString = typeof value === 'string' && value.trim().length > 0
  const isPositiveNumber = typeof value === 'number' && value > 0

  if (!isNonEmptyString && !isPositiveNumber) {
    throw new TypeError(
      'accessTokenExpiresIn must be a non-empty string or positive number'
    )
  }
}

export default class TokenService {
  constructor({ jwt, secret, accessTokenExpiresIn, issuer, audience } = {}) {
    requireFunction(jwt?.sign, 'jwt.sign')
    requireFunction(jwt?.verify, 'jwt.verify')
    requireNonEmptyString(secret, 'secret')
    requireTokenLifetime(accessTokenExpiresIn)
    requireNonEmptyString(issuer, 'issuer')
    requireNonEmptyString(audience, 'audience')

    this.jwt = jwt
    this.secret = secret
    this.accessTokenExpiresIn = accessTokenExpiresIn
    this.issuer = issuer
    this.audience = audience
  }

  signAccessToken(payload) {
    return this.jwt.sign(payload, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.accessTokenExpiresIn,
      issuer: this.issuer,
      audience: this.audience
    })
  }

  verifyAccessToken(token) {
    if (typeof token !== 'string' || token.trim().length === 0)
      return null

    try {
      return this.jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
        audience: this.audience
      })
    } catch (error) {
      if (INVALID_TOKEN_ERROR_NAMES.has(error?.name))
        return null

      throw error
    }
  }
}
