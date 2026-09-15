import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import RoomsController from '../../src/app/controllers/rooms.controller.js'

const room = {
  id: 1,
  roomNumber: '101',
  roomTypeId: 2,
  floor: 1,
  status: 'active',
  isDeleted: false
}

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn()
  }
  res.status.mockReturnValue(res)
  return res
}

let roomService
let roomsController
let res
let next

beforeEach(() => {
  roomService = {
    getRoomById: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deactivateRoom: vi.fn()
  }
  roomsController = new RoomsController({ roomService })
  res = createResponse()
  next = vi.fn()
})

describe('RoomsController [getRoomById]', () => {
  it('returns an existing room with status 200', async () => {
    // Arrange
    const req = { params: { roomId: String(room.id) } }
    roomService.getRoomById.mockResolvedValue(room)

    // Act
    await roomsController.getRoomById(req, res, next)

    // Assert
    expect(roomService.getRoomById).toHaveBeenCalledExactlyOnceWith(room.id)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: room })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('RoomsController [createRoom]', () => {
  it('creates a room and returns it with status 201', async () => {
    // Arrange
    const roomInfo = {
      roomNumber: room.roomNumber,
      roomTypeId: room.roomTypeId,
      floor: room.floor,
      status: room.status
    }
    const req = { body: roomInfo }
    roomService.createRoom.mockResolvedValue(room)

    // Act
    await roomsController.createRoom(req, res, next)

    // Assert
    expect(roomService.createRoom).toHaveBeenCalledExactlyOnceWith(roomInfo)
    expect(res.status).toHaveBeenCalledExactlyOnceWith(201)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: room })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('RoomsController [updateRoom]', () => {
  it('updates a room and returns it with status 200', async () => {
    // Arrange
    const updateInfo = {
      floor: 2,
      status: 'maintenance'
    }
    const updatedRoom = { ...room, ...updateInfo }
    const req = {
      params: { roomId: String(room.id) },
      body: updateInfo
    }
    roomService.updateRoom.mockResolvedValue(updatedRoom)

    // Act
    await roomsController.updateRoom(req, res, next)

    // Assert
    expect(roomService.updateRoom).toHaveBeenCalledExactlyOnceWith(
      room.id,
      updateInfo
    )
    expect(res.status).toHaveBeenCalledExactlyOnceWith(200)
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: updatedRoom })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('RoomsController [deactivateRoom]', () => {
  it.each([true, false])(
    'returns status 204 when the service returns %s',
    async deactivated => {
      // Arrange
      const req = { params: { roomId: String(room.id) } }
      roomService.deactivateRoom.mockResolvedValue(deactivated)

      // Act
      await roomsController.deactivateRoom(req, res, next)

      // Assert
      expect(roomService.deactivateRoom).toHaveBeenCalledExactlyOnceWith(room.id)
      expect(res.status).toHaveBeenCalledExactlyOnceWith(204)
      expect(res.send).toHaveBeenCalledExactlyOnceWith()
      expect(res.json).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    }
  )
})

describe.each([
  {
    controllerMethod: 'getRoomById',
    serviceMethod: 'getRoomById',
    req: () => ({ params: { roomId: String(room.id) } })
  },
  {
    controllerMethod: 'createRoom',
    serviceMethod: 'createRoom',
    req: () => ({
      body: {
        roomNumber: room.roomNumber,
        roomTypeId: room.roomTypeId,
        status: room.status
      }
    })
  },
  {
    controllerMethod: 'updateRoom',
    serviceMethod: 'updateRoom',
    req: () => ({
      params: { roomId: String(room.id) },
      body: { status: 'maintenance' }
    })
  },
  {
    controllerMethod: 'deactivateRoom',
    serviceMethod: 'deactivateRoom',
    req: () => ({ params: { roomId: String(room.id) } })
  }
])(
  'RoomsController [$controllerMethod error handling]',
  ({ controllerMethod, serviceMethod, req }) => {
    it('forwards service errors to the error middleware', async () => {
      // Arrange
      const error = new AppError('Room does not exist', 'ROOM_NOT_FOUND')
      roomService[serviceMethod].mockRejectedValue(error)

      // Act
      await roomsController[controllerMethod](req(), res, next)

      // Assert
      expect(next).toHaveBeenCalledExactlyOnceWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })
  }
)
