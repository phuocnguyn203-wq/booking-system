const DEFAULTS = Object.freeze({
  port: 3000,
  corsOrigins: ['http://localhost:5173'],
  accessTokenExpiresIn: '15m',
  jwtIssuer: 'booking-system',
  jwtAudience: 'booking-system-api'
})

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new TypeError(`${name} must be a non-empty string`)

  return value.trim()
}

function readOptionalString(value, fallback, name) {
  return value === undefined
    ? fallback
    : requireNonEmptyString(value, name)
}

function parsePort(value) {
  if (value === undefined)
    return DEFAULTS.port

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new TypeError('PORT must be an integer between 1 and 65535')

  return port
}

function parseDatabaseUrl(value) {
  const databaseUrl = requireNonEmptyString(value, 'DATABASE_URL')

  try {
    const parsedUrl = new URL(databaseUrl)
    if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol))
      throw new Error('Unsupported protocol')
  } catch {
    throw new TypeError('DATABASE_URL must be a valid PostgreSQL URL')
  }

  return databaseUrl
}

function parseCorsOrigins(value) {
  if (value === undefined)
    return DEFAULTS.corsOrigins

  const origins = value.split(',').map(origin => origin.trim()).filter(Boolean)
  if (origins.length === 0)
    throw new TypeError('CORS_ORIGINS must contain at least one origin')

  for (const origin of origins) {
    try {
      const parsedOrigin = new URL(origin)
      if (!['http:', 'https:'].includes(parsedOrigin.protocol))
        throw new Error('Unsupported protocol')
    } catch {
      throw new TypeError(`Invalid CORS origin: ${origin}`)
    }
  }

  return origins
}

export default function createConfig(env = process.env) {
  const jwtSecret = requireNonEmptyString(env.JWT_SECRET, 'JWT_SECRET')
  if (jwtSecret.length < 32)
    throw new TypeError('JWT_SECRET must contain at least 32 characters')

  return Object.freeze({
    port: parsePort(env.PORT),
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
    jwtSecret,
    accessTokenExpiresIn: readOptionalString(
      env.ACCESS_TOKEN_EXPIRES_IN,
      DEFAULTS.accessTokenExpiresIn,
      'ACCESS_TOKEN_EXPIRES_IN'
    ),
    jwtIssuer: readOptionalString(
      env.JWT_ISSUER,
      DEFAULTS.jwtIssuer,
      'JWT_ISSUER'
    ),
    jwtAudience: readOptionalString(
      env.JWT_AUDIENCE,
      DEFAULTS.jwtAudience,
      'JWT_AUDIENCE'
    )
  })
}
