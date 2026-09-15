export default class UserRolesController {
  constructor({ userRoleService }) {
    this.userRoleService = userRoleService

    this.addUserRole = this.addUserRole.bind(this)
    this.removeUserRole = this.removeUserRole.bind(this)
  }

  async addUserRole(req, res, next) {
    try {
      const { userId, roleId } = req.validated.params
      const assignedRoleId = await this.userRoleService.addUserRole(
        userId,
        roleId
      )

      return res.status(201).json({
        data: { userId, roleId: assignedRoleId }
      })
    } catch (error) {
      return next(error)
    }
  }

  async removeUserRole(req, res, next) {
    try {
      const { userId, roleId } = req.validated.params
      await this.userRoleService.removeUserRole(userId, roleId)

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }
}
