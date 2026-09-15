export default class RolesController {
  constructor({ roleService }) {
    this.roleService = roleService

    this.getRoleById = this.getRoleById.bind(this)
    this.createRole = this.createRole.bind(this)
    this.updateRole = this.updateRole.bind(this)
    this.deactivateRole = this.deactivateRole.bind(this)
  }

  async getRoleById(req, res, next) {
    try {
      const roleId = Number(req.params.roleId)
      const role = await this.roleService.getRoleById(roleId)

      return res.status(200).json({ data: role })
    } catch (error) {
      return next(error)
    }
  }

  async createRole(req, res, next) {
    try {
      const role = await this.roleService.createRole(req.body)

      return res.status(201).json({ data: role })
    } catch (error) {
      return next(error)
    }
  }

  async updateRole(req, res, next) {
    try {
      const roleId = Number(req.params.roleId)
      const role = await this.roleService.updateRole(roleId, req.body)

      return res.status(200).json({ data: role })
    } catch (error) {
      return next(error)
    }
  }

  async deactivateRole(req, res, next) {
    try {
      const roleId = Number(req.params.roleId)
      const role = await this.roleService.deactivateRole(roleId)

      return res.status(200).json({ data: role })
    } catch (error) {
      return next(error)
    }
  }
}
