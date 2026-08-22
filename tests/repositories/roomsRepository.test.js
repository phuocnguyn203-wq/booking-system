import { expect, describe } from "vitest";
import { it as baseIt } from 'vitest'
import { query } from "../../src/database/index.js"
import { cleanBeforeEachAndAfterAll, createTestRoom, createTestRoomType } from "./testHelper.js";
import RoomRepository from "../../src/app/repositories/rooms.repository.js";

await cleanBeforeEachAndAfterAll()

const it = baseIt.extend('roomRepository', () => {
  return new RoomRepository(query)
})

/*
Room obj:
- id: Number
- roomNumber: String
- roomTypeId: Number
- floor: String
- status: String
- isDeleted: Boolean
*/

describe('RoomRepository [findById]', () => {
  it('returns room object when given existed room id', async ({ roomRepository }) => {
    // Arrange
    const testRoom = await createTestRoom();

    // Act
    const room = await roomRepository.findById(testRoom.id);

    // Arrange
    expect(room).toMatchObject(testRoom)
  })

  it('returns null when given non-exist room id', async({ roomRepository }) => {
    // Arrange
    const nonExistId = 10

    // Act
    const nonExistRoom = await roomRepository.findById(nonExistId)

    // Assert
    expect(nonExistRoom).toBeNull()
  })

  it('returns null when given deleted room id', async({ roomRepository }) => {
    // Arrange
    const testRoom = await createTestRoom({ isDeleted: true })

    // Act
    const room = await roomRepository.findById(testRoom.id)

    // Assert
    expect(room).toBeNull()
  })
})

describe('RoomRepository [createRoom]', () => {
  it('creates and returns room object that has is_deleted is false by default', async({ roomRepository }) => {
    // Arrange
    const testRoomInfo = {
      roomNumber: 'TEST ROOM 50',
      roomTypeId: (await createTestRoomType()).id,
      floor: 2,
      status: 'active',
    }

    // Act
    const newRoomReturned = await roomRepository.createRoom(testRoomInfo)

    // Assert
    expect(newRoomReturned).toMatchObject(testRoomInfo)
    // Assert side effect
    const newRoomInDb = await roomRepository.findById(newRoomReturned.id)
    expect(newRoomInDb).toMatchObject(newRoomReturned)
  })

  it('doesnot create and raises AppError when not given roomTypeId', async({ roomRepository }) => {
    // Arrange
    const roomInfo = {
      roomNumber: 'TEST NUMBER 10',
      floor: 2,
      roomTypeId: (await createTestRoomType()).id,
    }

    //Act
    const roomPromise = roomRepository.createRoom(roomInfo)
    
    // Assert
    await expect(roomPromise).rejects.toMatchObject({
      statusCode: 400,
      message: 'Required fields are missing'
    })
  })

  it('doesnot create and raises AppError when not given status', async({ roomRepository }) => {
    // Arrange
    const roomInfo = {
      roomNumber: 'TEST NUMBER 10',
      floor: 2,
      status: 'active',
    }

    //Act
    const roomPromise = roomRepository.createRoom(roomInfo)
    
    // Assert
    await expect(roomPromise).rejects.toMatchObject({
      statusCode: 400,
      message: 'Required fields are missing'
    })
  })

  it('returns object that has null as floor and creates when not given floor', async({ roomRepository }) => {
    // Arrange
    const roomInfo = {
      roomNumber: 'TEST NUMBER 10',
      roomTypeId: (await createTestRoomType()).id,
      status: 'active',
    }

    //Act
    const roomPromise = await roomRepository.createRoom(roomInfo)
    
    // Assert
    await expect(roomPromise).toMatchObject({
      ...roomInfo,
      floor: null
    })
  })

  it('doesnot create and raises AppError when given non-existent roomTypeId', async ({ roomRepository }) => {
    // Arrange
    const nonExistentRoomTypeId = 10
    const roomInfo = {
      roomNumber: 'TEST NUMBER 10',
      roomTypeId: nonExistentRoomTypeId,
      floor: 1,
      status: 'active',
    }

    // Act
    const room = roomRepository.createRoom(roomInfo)

    // Assert
    await expect(room).rejects.toMatchObject({
      statusCode: 400,
      message: 'Room type does not exist'
    })
  })

  it('doesnot create and raises AppError when given invalid status', async ({ roomRepository }) => {
    // Arrange
    const invalidStatus = 'Absolute invalid'
    const roomInfo = {
      roomNumber: 'TEST NUMBER 10',
      roomTypeId: (await createTestRoomType()).id,
      floor: 1,
      status: invalidStatus,
    }

    // Act
    const room = roomRepository.createRoom(roomInfo)

    // Assert
    await expect(room).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid status room'
    })
  })
})

describe('RoomRepository [deleteById]', () => {
  it('soft deletes and returns true when given room id', async({ roomRepository }) => {
    // Arrange
    const testRoom = await createTestRoom()

    // Act
    const is_deleted = await roomRepository.deleteById(testRoom.id)

    // Assert
    expect(is_deleted).toBe(true)
    // Assert side effect
    const rowResult = await query(
      `
      SELECT id FROM rooms
      WHERE id=$1 AND is_deleted=true
      `,
      [testRoom.id]
    )
    expect(rowResult.rows.length).toBe(1)
  })

  it('returns false if it\'s already soft deleted or deleted permanently when given room id', async({ roomRepository }) => {
    // Arrange
    const testRoom = await createTestRoom({ isDeleted: true })

    // Act
    const is_deleted = await roomRepository.deleteById(testRoom.id)

    // Assert
    expect(is_deleted).toBe(false)
  })
})

describe('RoomRepository [updateRoom]', () => {
  it('updates status when given new value', async({ roomRepository }) => {
    // Arrange
    const newStatus = 'maintenance'
    const testRoom = await createTestRoom()

    // Act
    const newRoom = await roomRepository.updateRoom(testRoom.id, { status: newStatus })

    // Assert
    expect(newRoom.status).toBe(newStatus)
    // Assert side effect
    const rowResult = await query(
      `
      SELECT status FROM rooms
      WHERE id=$1
      `,
      [testRoom.id]
    )
    const newRoomInDb = rowResult.rows[0]
    expect(newRoomInDb.status).toBe(newStatus)
  })
  it('updates room number when given new room number', async({ roomRepository }) => {
    // Arrange
    const newRoomNumber = 'Test Room 100'
    const testRoom = await createTestRoom()

    // Act
    const newRoom = await roomRepository.updateRoom(testRoom.id, { room_number: newRoomNumber })

    // Assert
    expect(newRoom.roomNumber).toBe(newRoomNumber)
    //Assert side effect
    const rowResult = await query(`SELECT name FROM rooms WHERE id=$1`, [testRoom.id])
    expect(rowResult.rows[0].roomNumber).toBe(newRoomNumber)
  })

  it('updates room type id when given new room type id', async({ roomRepository }) => {
    // Arrange
    const newRoomTypeId = (await createTestRoomType()).id
    const testRoom = await createTestRoom()

    // Act
    const newRoom = await roomRepository.updateRoom(testRoom.id, { room_type_id: newRoomTypeId })

    // Assert
    expect(newRoom.roomTypeId).toBe(newRoomTypeId)
    //Assert side effect
    const rowResult = await query(`SELECT price_per_night FROM rooms WHERE id=$1`, [testRoom.id])
    expect(Number(rowResult.rows[0].room_type_id)).toBe(newRoomTypeId)
  })
})
