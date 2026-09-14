import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/app/errors/AppError.js'
import RepositoryError from '../../src/app/errors/RepositoryError.js'
import RoomService from '../../src/app/services/rooms.service.js'
import { expectAppError } from './serviceTestAssertions.js'

// TDD contract: implement rooms.service.js with constructor({ roomRepository }).
// Public methods: getRoomById, createRoom, updateRoom, deactivateRoom.
// Like UserService, deactivateRoom soft deletes and returns a boolean.
// Room-specific AppError codes below are expectations for the future service.
const activeRoom = {
  id: 1,
  roomNumber: '101',
  roomTypeId: 2,
  floor: 1,
  status: 'active',
  isDeleted: false
}

let roomRepository
let roomService
let roomInfo

beforeEach(() => {
  roomRepository = {
    findById: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteById: vi.fn()
  }
  roomInfo = {
    roomNumber: activeRoom.roomNumber,
    roomTypeId: activeRoom.roomTypeId,
    floor: activeRoom.floor,
    status: activeRoom.status
  }
  roomService = new RoomService({ roomRepository })
})

describe('RoomService [getRoomById]', () => {
  it.each(['active', 'maintenance', 'out_of_service'])(
    'returns an existing room with status %s',
    async status => {
      // Arrange
      const existingRoom = { ...activeRoom, status }
      roomRepository.findById.mockResolvedValue(existingRoom)

      // Act
      const room = await roomService.getRoomById(existingRoom.id)

      // Assert
      expect(room).toEqual(existingRoom)
      expect(roomRepository.findById).toHaveBeenCalledExactlyOnceWith(existingRoom.id)
    }
  )

  it('rejects when the room is missing or soft deleted', async () => {
    // The repository returns null for both cases.
    roomRepository.findById.mockResolvedValue(null)

    await expectAppError(roomService.getRoomById(999999), {
      code: 'ROOM_NOT_FOUND'
    })
  })
})

describe('RoomService [createRoom]', () => {
  it('creates and returns room information', async () => {
    // Arrange
    roomRepository.createRoom.mockResolvedValue(activeRoom)

    // Act
    const room = await roomService.createRoom(roomInfo)

    // Assert
    expect(room).toEqual(activeRoom)
    expect(roomRepository.createRoom).toHaveBeenCalledExactlyOnceWith(roomInfo)
  })

  it('allows creating a room without an optional floor', async () => {
    // Arrange
    delete roomInfo.floor
    const createdRoom = { ...activeRoom, floor: null }
    roomRepository.createRoom.mockResolvedValue(createdRoom)

    // Act
    const room = await roomService.createRoom(roomInfo)

    // Assert
    expect(room).toEqual(createdRoom)
    expect(roomRepository.createRoom).toHaveBeenCalledExactlyOnceWith(roomInfo)
  })
})

describe('RoomService [updateRoom]', () => {
  it('updates only roomNumber, roomTypeId, floor and status without changing the input', async () => {
    // Arrange
    const updateInfo = Object.freeze({
      roomNumber: '202',
      roomTypeId: 3,
      floor: 2,
      status: 'maintenance',
      id: 99,
      isDeleted: true,
      unknownField: 'ignored'
    })
    const expectedUpdate = {
      roomNumber: '202',
      roomTypeId: 3,
      floor: 2,
      status: 'maintenance'
    }
    const updatedRoom = { ...activeRoom, ...expectedUpdate }
    roomRepository.updateRoom.mockResolvedValue(updatedRoom)

    // Act
    const room = await roomService.updateRoom(activeRoom.id, updateInfo)

    // Assert
    expect(room).toEqual(updatedRoom)
    expect(roomRepository.updateRoom).toHaveBeenCalledExactlyOnceWith(
      activeRoom.id,
      expectedUpdate
    )
  })

  it.each([0, null])('preserves floor %s and omits undefined fields', async floor => {
    // Arrange
    const updatedRoom = { ...activeRoom, floor }
    roomRepository.updateRoom.mockResolvedValue(updatedRoom)

    // Act
    const room = await roomService.updateRoom(activeRoom.id, {
      floor,
      roomNumber: undefined,
      roomTypeId: undefined,
      status: undefined
    })

    // Assert
    expect(room).toEqual(updatedRoom)
    expect(roomRepository.updateRoom).toHaveBeenCalledExactlyOnceWith(
      activeRoom.id,
      { floor }
    )
  })

  it.each([
    { label: 'an empty object', updateInfo: {} },
    { label: 'null', updateInfo: null },
    { label: 'undefined', updateInfo: undefined },
    { label: 'protected or unknown fields', updateInfo: { id: 99, isDeleted: true, unknownField: 'ignored' } },
    { label: 'only undefined values', updateInfo: { roomNumber: undefined, roomTypeId: undefined, floor: undefined, status: undefined } }
  ])('rejects $label without calling the repository', async ({ updateInfo }) => {
    await expectAppError(roomService.updateRoom(activeRoom.id, updateInfo), {
      code: 'NO_ROOM_FIELDS_TO_UPDATE'
    })
    expect(roomRepository.updateRoom).not.toHaveBeenCalled()
  })

  it('rejects when the room is missing or soft deleted', async () => {
    roomRepository.updateRoom.mockResolvedValue(null)

    await expectAppError(roomService.updateRoom(999999, { status: 'maintenance' }), {
      code: 'ROOM_NOT_FOUND'
    })
  })

  it('maps a repository NO_UPDATABLE_FIELDS error', async () => {
    roomRepository.updateRoom.mockRejectedValue(
      new RepositoryError('NO_UPDATABLE_FIELDS')
    )

    await expectAppError(roomService.updateRoom(activeRoom.id, { floor: 2 }), {
      code: 'NO_ROOM_FIELDS_TO_UPDATE'
    })
  })
})

describe('RoomService [deactivateRoom]', () => {
  it('returns true when the room is soft deleted', async () => {
    roomRepository.deleteById.mockResolvedValue(true)

    const deactivated = await roomService.deactivateRoom(activeRoom.id)

    expect(deactivated).toBe(true)
    expect(roomRepository.deleteById).toHaveBeenCalledExactlyOnceWith(activeRoom.id)
  })

  it('returns false when the room is already deleted or does not exist', async () => {
    roomRepository.deleteById.mockResolvedValue(false)

    const deactivated = await roomService.deactivateRoom(999999)

    expect(deactivated).toBe(false)
    expect(roomRepository.deleteById).toHaveBeenCalledExactlyOnceWith(999999)
  })
})

describe.each(['createRoom', 'updateRoom'])('RoomService [%s constraint errors]', method => {
  it.each([
    {
      label: 'duplicate room number',
      repositoryCode: 'UNIQUE_CONSTRAINT',
      details: { constraint: 'rooms_room_number_key' },
      expected: { code: 'ROOM_NUMBER_ALREADY_EXISTS' }
    },
    {
      label: 'missing room type',
      repositoryCode: 'FOREIGN_KEY_CONSTRAINT',
      details: { constraint: 'rooms_room_type_fk' },
      expected: { code: 'ROOM_TYPE_NOT_FOUND' }
    },
    ...['room_number', 'room_type_id', 'status'].map(column => ({
      label: `null ${column}`,
      repositoryCode: 'NOT_NULL_CONSTRAINT',
      details: { column },
      expected: { code: 'INVALID_ROOM_DATA' }
    })),
    {
      label: 'invalid status',
      repositoryCode: 'CHECK_CONSTRAINT',
      details: { constraint: 'rooms_valid_status' },
      expected: { code: 'INVALID_ROOM_DATA' }
    },
    {
      label: 'an unrelated unique constraint',
      repositoryCode: 'UNIQUE_CONSTRAINT',
      details: { constraint: 'unrelated_unique_key' },
      expected: { code: 'INTERNAL_ERROR' }
    },
    {
      label: 'an unrelated foreign key constraint',
      repositoryCode: 'FOREIGN_KEY_CONSTRAINT',
      details: { constraint: 'unrelated_fk' },
      expected: { code: 'INTERNAL_ERROR' }
    }
  ])('maps $label to an AppError', async ({ repositoryCode, details, expected }) => {
    // Arrange
    roomRepository[method].mockRejectedValue(new RepositoryError(repositoryCode, details))

    // Act
    const roomPromise = method === 'createRoom'
      ? roomService.createRoom(roomInfo)
      : roomService.updateRoom(activeRoom.id, roomInfo)

    // Assert
    await expectAppError(roomPromise, expected)
  })
})

describe.each([
  { method: 'getRoomById', repositoryMethod: 'findById', args: () => [activeRoom.id] },
  { method: 'createRoom', repositoryMethod: 'createRoom', args: () => [roomInfo] },
  { method: 'updateRoom', repositoryMethod: 'updateRoom', args: () => [activeRoom.id, { floor: 2 }] },
  { method: 'deactivateRoom', repositoryMethod: 'deleteById', args: () => [activeRoom.id] }
])('RoomService [$method error handling]', ({ method, repositoryMethod, args }) => {
  it.each(['DATA_ACCESS_ERROR', 'UNKNOWN_REPOSITORY_ERROR'])(
    'does not expose repository error %s',
    async code => {
      roomRepository[repositoryMethod].mockRejectedValue(
        new RepositoryError(code, { cause: new Error('Private database details') })
      )

      await expectAppError(roomService[method](...args()), {
        code: 'INTERNAL_ERROR',
        message: 'Internal error'
      })
    }
  )

  it('preserves an existing AppError', async () => {
    const error = new AppError('Room operation unavailable', 'ROOM_OPERATION_UNAVAILABLE')
    roomRepository[repositoryMethod].mockRejectedValue(error)

    await expect(roomService[method](...args())).rejects.toBe(error)
  })

  it('rethrows unexpected errors unchanged', async () => {
    const error = new TypeError('Unexpected service dependency failure')
    roomRepository[repositoryMethod].mockRejectedValue(error)

    await expect(roomService[method](...args())).rejects.toBe(error)
  })
})
