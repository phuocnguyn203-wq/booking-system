import { describe, expect, it } from 'vitest'
import PasswordHasherAdapter from '../../src/app/adapters/passwordHasher.adapter.js'

const password = 'StrongPassword123!'

function createPasswordHasher() {
  // A lower cost keeps unit tests fast; production uses the adapter's stronger
  // default and stores its parameters inside every encoded hash.
  return new PasswordHasherAdapter({ cost: 1024 })
}

describe('PasswordHasherAdapter [hash and compare]', () => {
  it('creates a self-describing hash that verifies the original password', async () => {
    // Arrange
    const passwordHasher = createPasswordHasher()

    // Act
    const encodedHash = await passwordHasher.hash(password)

    // Assert
    expect(encodedHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[^$]+\$[^$]+$/)
    await expect(passwordHasher.compare(password, encodedHash))
      .resolves.toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const passwordHasher = createPasswordHasher()
    const encodedHash = await passwordHasher.hash(password)

    await expect(passwordHasher.compare('IncorrectPassword!', encodedHash))
      .resolves.toBe(false)
  })

  it('uses a unique random salt for every hash', async () => {
    const passwordHasher = createPasswordHasher()

    const firstHash = await passwordHasher.hash(password)
    const secondHash = await passwordHasher.hash(password)

    expect(firstHash).not.toBe(secondHash)
    await expect(passwordHasher.compare(password, firstHash)).resolves.toBe(true)
    await expect(passwordHasher.compare(password, secondHash)).resolves.toBe(true)
  })

  it.each([
    '',
    'not-an-encoded-hash',
    'bcrypt$1024$8$1$c2FsdA$aGFzaA',
    'scrypt$invalid$8$1$c2FsdA$aGFzaA',
    'scrypt$1073741824$8$1$c2FsdA$aGFzaA',
    'scrypt$1024$8$1$***$***'
  ])('returns false for malformed or unsupported hash %j', async encodedHash => {
    const passwordHasher = createPasswordHasher()

    await expect(passwordHasher.compare(password, encodedHash))
      .resolves.toBe(false)
  })

  it.each([undefined, null, 123, ''])(
    'rejects invalid password input %j when hashing',
    async invalidPassword => {
      const passwordHasher = createPasswordHasher()

      await expect(passwordHasher.hash(invalidPassword))
        .rejects.toBeInstanceOf(TypeError)
    }
  )
})

describe('PasswordHasherAdapter [configuration]', () => {
  it.each([
    { cost: 1000 },
    { cost: 1 },
    { blockSize: 0 },
    { parallelization: 0 },
    { keyLength: 15 },
    { saltLength: 7 }
  ])('rejects unsafe configuration %j', configuration => {
    expect(() => new PasswordHasherAdapter(configuration)).toThrow(TypeError)
  })
})
