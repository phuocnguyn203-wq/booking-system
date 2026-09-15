export default class RoomsController {
  constructor({ roomService }) {
    this.roomService = roomService

    this.getRoomById = this.getRoomById.bind(this)
    this.createRoom = this.createRoom.bind(this)
    this.updateRoom = this.updateRoom.bind(this)
    this.deactivateRoom = this.deactivateRoom.bind(this)
  }

  async getRoomById(req, res, next) {
    try {
      const roomId = Number(req.params.roomId)
      const room = await this.roomService.getRoomById(roomId)

      return res.status(200).json({ data: room })
    } catch (error) {
      return next(error)
    }
  }

  async createRoom(req, res, next) {
    try {
      const room = await this.roomService.createRoom(req.body)

      return res.status(201).json({ data: room })
    } catch (error) {
      return next(error)
    }
  }

  async updateRoom(req, res, next) {
    try {
      const roomId = Number(req.params.roomId)
      const room = await this.roomService.updateRoom(roomId, req.body)

      return res.status(200).json({ data: room })
    } catch (error) {
      return next(error)
    }
  }

  async deactivateRoom(req, res, next) {
    try {
      const roomId = Number(req.params.roomId)
      await this.roomService.deactivateRoom(roomId)

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }
}
