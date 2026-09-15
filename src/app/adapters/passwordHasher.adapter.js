import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual
} from 'node:crypto'

const DEFAULT_OPTIONS = Object.freeze({
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
  saltLength: 16
})

const LIMITS = Object.freeze({
  minimumCost: 1024,
  maximumCost: 65536,
  maximumBlockSize: 32,
  maximumParallelization: 16,
  minimumKeyLength: 16,
  maximumKeyLength: 128,
  minimumSaltLength: 8,
  maximumSaltLength: 64
})

function isIntegerBetween(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum
}

function validateOptions(options) {
  if (
    !isIntegerBetween(
      options.cost,
      LIMITS.minimumCost,
      LIMITS.maximumCost
    ) ||
    (options.cost & (options.cost - 1)) !== 0
  ) {
    throw new TypeError('scrypt cost must be a supported power of two')
  }

  if (!isIntegerBetween(options.blockSize, 1, LIMITS.maximumBlockSize))
    throw new TypeError('scrypt blockSize is invalid')

  if (
    !isIntegerBetween(
      options.parallelization,
      1,
      LIMITS.maximumParallelization
    )
  ) {
    throw new TypeError('scrypt parallelization is invalid')
  }

  if (
    !isIntegerBetween(
      options.keyLength,
      LIMITS.minimumKeyLength,
      LIMITS.maximumKeyLength
    )
  ) {
    throw new TypeError('scrypt keyLength is invalid')
  }

  if (
    !isIntegerBetween(
      options.saltLength,
      LIMITS.minimumSaltLength,
      LIMITS.maximumSaltLength
    )
  ) {
    throw new TypeError('scrypt saltLength is invalid')
  }
}

function requirePassword(password) {
  if (typeof password !== 'string' || password.length === 0)
    throw new TypeError('password must be a non-empty string')
}

function deriveKey(password, salt, options) {
  const requiredMemory = 128 * options.cost * options.blockSize
  const maxmem = Math.max(32 * 1024 * 1024, requiredMemory * 2)

  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      options.keyLength,
      {
        N: options.cost,
        r: options.blockSize,
        p: options.parallelization,
        maxmem
      },
      (error, derivedKey) => {
        if (error)
          return reject(error)

        return resolve(derivedKey)
      }
    )
  })
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value))
    return null

  const decoded = Buffer.from(value, 'base64url')

  return decoded.toString('base64url') === value ? decoded : null
}

function parseNumber(value) {
  if (!/^\d+$/.test(value))
    return null

  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

function parseEncodedHash(encodedHash) {
  if (typeof encodedHash !== 'string')
    return null

  const parts = encodedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt')
    return null

  const [, costValue, blockSizeValue, parallelizationValue, saltValue, hashValue] = parts
  const salt = decodeBase64Url(saltValue)
  const hash = decodeBase64Url(hashValue)
  const options = {
    cost: parseNumber(costValue),
    blockSize: parseNumber(blockSizeValue),
    parallelization: parseNumber(parallelizationValue),
    keyLength: hash?.length,
    saltLength: salt?.length
  }

  try {
    validateOptions(options)
  } catch {
    return null
  }

  return { salt, hash, options }
}

export default class PasswordHasherAdapter {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
    validateOptions(this.options)
  }

  async hash(password) {
    requirePassword(password)

    const salt = randomBytes(this.options.saltLength)
    const hash = await deriveKey(password, salt, this.options)

    // Parameters travel with the hash so existing passwords remain verifiable
    // after the application raises its hashing cost in a future release.
    return [
      'scrypt',
      this.options.cost,
      this.options.blockSize,
      this.options.parallelization,
      salt.toString('base64url'),
      hash.toString('base64url')
    ].join('$')
  }

  async compare(password, encodedHash) {
    requirePassword(password)

    const parsedHash = parseEncodedHash(encodedHash)
    if (parsedHash === null)
      return false

    const actualHash = await deriveKey(
      password,
      parsedHash.salt,
      parsedHash.options
    )

    return timingSafeEqual(actualHash, parsedHash.hash)
  }
}
