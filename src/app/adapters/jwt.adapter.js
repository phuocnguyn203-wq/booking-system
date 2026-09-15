import jsonwebtoken from 'jsonwebtoken'

export default class JwtAdapter {
  constructor({ jwt = jsonwebtoken } = {}) {
    if (typeof jwt?.sign !== 'function' || typeof jwt?.verify !== 'function')
      throw new TypeError('JWT implementation must provide sign and verify')

    this.jwt = jwt
  }

  sign(payload, secret, options) {
    return this.jwt.sign(payload, secret, options)
  }

  verify(token, secret, options) {
    return this.jwt.verify(token, secret, options)
  }
}
