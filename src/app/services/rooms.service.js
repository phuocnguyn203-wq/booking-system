import createAppError, { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'
import RepositoryError from '../errors/RepositoryError.js'

function mapRepositoryError(error) {
  if (
    error.code === 'UNIQUE_CONSTRAINT' &&
    error.constraint === 'rooms_room_number_key'
  ) {
    return createAppError(Errors.ROOM_NUMBER_ALREADY_EXISTS)
  }

  if (
    error.code === 'FOREIGN_KEY_CONSTRAINT' &&
    error.constraint === 'rooms_room_type_fk'
  ) {
    return createAppError(Errors.ROOM_TYPE_NOT_FOUND)
  }

  if (
    error.code === 'NOT_NULL_CONSTRAINT' ||
    error.code === 'CHECK_CONSTRAINT'
  ) {
    return createAppError(Errors.INVALID_ROOM_DATA)
  }

  if (error.code === 'NO_UPDATABLE_FIELDS')
    return createAppError(Errors.NO_ROOM_FIELDS_TO_UPDATE)

  return createAppError(Errors.DATA_ACCESS_ERROR)
}

function throwServiceError(error) {
  if (error instanceof AppError)
    throw error

  if (error instanceof RepositoryError)
    throw mapRepositoryError(error)

  throw error
}

export default class RoomService {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository
  }

  async listAvailableRooms({
    page,
    limit,
    checkInDate,
    checkOutDate,
    capacity
  }) {
    try {
      const result = await this.roomRepository.findAvailable({
        checkInDate,
        checkOutDate,
        capacity,
        limit,
        offset: (page - 1) * limit
      })

      return { ...result, page, limit }
    } catch (error) {
      throwServiceError(error)
    }
  }

  async getRoomById(roomId) {
    try {
      const room = await this.roomRepository.findById(roomId)

      if (room === null)
        throw createAppError(Errors.ROOM_NOT_FOUND)

      return room
    } catch (error) {
      throwServiceError(error)
    }
  }

  async createRoom(roomInfo) {
    try {
      return await this.roomRepository.createRoom(roomInfo)
    } catch (error) {
      throwServiceError(error)
    }
  }

  async updateRoom(roomId, updateInfo) {
    const updatableFields = ['roomNumber', 'roomTypeId', 'floor', 'status']
    const filteredUpdate = {}

    for (const field of updatableFields) {
      if (updateInfo?.[field] !== undefined)
        filteredUpdate[field] = updateInfo[field]
    }

    if (Object.keys(filteredUpdate).length === 0)
      throw createAppError(Errors.NO_ROOM_FIELDS_TO_UPDATE)

    try {
      const room = await this.roomRepository.updateRoom(roomId, filteredUpdate)

      if (room === null)
        throw createAppError(Errors.ROOM_NOT_FOUND)

      return room
    } catch (error) {
      throwServiceError(error)
    }
  }

  async deactivateRoom(roomId) {
    try {
      return await this.roomRepository.deleteById(roomId)
    } catch (error) {
      throwServiceError(error)
    }
  }
}
