export default class UsersController {
  constructor({ userService }) {
    this.userService = userService

    this.getCurrentUser = this.getCurrentUser.bind(this)
    this.updateCurrentUser = this.updateCurrentUser.bind(this)
    this.getUserById = this.getUserById.bind(this)
    this.createUser = this.createUser.bind(this)
    this.updateUser = this.updateUser.bind(this)
    this.deactivateUser = this.deactivateUser.bind(this)
    this.changePassword = this.changePassword.bind(this)
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = await this.userService.getUserById(req.user.id)

      return res.status(200).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async updateCurrentUser(req, res, next) {
    try {
      const user = await this.userService.updateUser(
        req.user.id,
        req.validated.body
      )

      return res.status(200).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async getUserById(req, res, next) {
    try {
      const { userId } = req.validated.params
      const user = await this.userService.getUserById(userId)

      return res.status(200).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await this.userService.createUser(req.validated.body)

      return res.status(201).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async updateUser(req, res, next) {
    try {
      const { userId } = req.validated.params
      const user = await this.userService.updateUser(
        userId,
        req.validated.body
      )

      return res.status(200).json({ data: user })
    } catch (error) {
      return next(error)
    }
  }

  async deactivateUser(req, res, next) {
    try {
      const { userId } = req.validated.params
      await this.userService.deactivateUser(userId)

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }

  async changePassword(req, res, next) {
    try {
      const userId = req.user.id
      const { currentPassword, newPassword } = req.validated.body
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
