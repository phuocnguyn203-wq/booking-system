export default class UsersController {
  constructor({ userService }) {
    this.userService = userService

    this.getUserById = this.getUserById.bind(this)
    this.createUser = this.createUser.bind(this)
    this.updateUser = this.updateUser.bind(this)
    this.deactivateUser = this.deactivateUser.bind(this)
    this.changePassword = this.changePassword.bind(this)
  }

  async getUserById(req, res, next) {
    try {
      const userId = Number(req.params.userId)
      const user = await this.userService.getUserById(userId)

      return res.status(200).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await this.userService.createUser(req.body)

      return res.status(201).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async updateUser(req, res, next) {
    try {
      const userId = Number(req.params.userId)
      const user = await this.userService.updateUser(userId, req.body)

      return res.status(200).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async deactivateUser(req, res, next) {
    try {
      const userId = Number(req.params.userId)
      await this.userService.deactivateUser(userId)

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }

  async changePassword(req, res, next) {
    try {
      const userId = Number(req.params.userId)
      const { currentPassword, newPassword } = req.body ?? {}
      const user = await this.userService.changePassword(
        userId,
        currentPassword,
        newPassword
      )

      return res.status(200).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }
}
