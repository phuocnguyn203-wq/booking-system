export default class AuthController {
  constructor({ authService }) {
    this.authService = authService

    this.login = this.login.bind(this)
  }

  async login(req, res, next) {
    try {
      const authentication = await this.authService.login(req.validated.body)

      return res.status(200).json({ data: authentication })
    } catch (error) {
      return next(error)
    }
  }
}
