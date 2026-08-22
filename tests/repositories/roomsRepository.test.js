import { expect, describe } from "vitest";
import { it as baseIt } from 'vitest'
import { query } from "../../src/database/index.js"
import { cleanBeforeEachAndAfterAll, createTestRoom } from "./testHelper.js";
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
  it('creates and returns room object', async({ roomRepository }) => {
    // Arrance
    const testRoomInfo = {
      name: 'MyRoom',
      pricePerNight: 50
    }

    // Act
    const newRoomReturned = await roomRepository.createRoom(testRoomInfo)

    // Assert
    expect(newRoomReturned).toEqual(expect.objectContaining(testRoomInfo))
    // Assert side effect
    const newRoomInDb = await roomRepository.findById(newRoomReturned.id)
    expect(newRoomInDb).toEqual(newRoomReturned)
  })

  it('doesnot create and raises AppError when given duplicated name', async({ roomRepository }) => {
    // Arrange
    const duplicatedName = 'My Room'
    const pricePerNight = 100
    const testRoom = await createTestRoom({name: duplicatedName})

    //Act
    const roomPromise = roomRepository.createRoom({ 
      name: duplicatedName,
      pricePerNight: pricePerNight
     })
    
    // Assert
    await expect(roomPromise).rejects.toMatchObject({
      statusCode: 409,
      message: 'Room already exists'
    })
    
    // Assert side effect
    const resultRoomInDb = await query(
      `
      SELECT id FROM rooms
      WHERE id=$1
      `,
      [testRoom.id]
    )
    expect(resultRoomInDb.rows.length).toBe(1)
  })
})

describe('Room Repository [deleteById]', () => {
  it('soft deletes and returns true when given room id', async({ roomRepository }) => {
    // Arrange
    const testRoom = await createTestRoom({})

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

describe('Room Repository [updateRoom]', () => {
  it('updates both name and pricePerNight when given new value', async({ roomRepository }) => {
    // Arrange
    const newName = 'New Name'
    const newPricePerNight = 2948.10
    const testRoom = await createTestRoom({ name: 'Old name', pricePerNight: 100.0 })

    // Act
    const newRoom = roomRepository.updateRoom(testRoom.id, { name: newName, price_per_night: newPricePerNight })

    // Assert
    await expect(newRoom).resolves.toEqual(
      expect.objectContaining({
        name: newName,
        pricePerNight: newPricePerNight
      })
    )
    // Assert side effect
    const rowResult = await query(
      `
      SELECT name, price_per_night FROM rooms
      WHERE id=$1
      `,
      [testRoom.id]
    )
    const newRoomInDb = rowResult.rows[0]
    expect(newRoomInDb).toEqual(
      expect.objectContaining({
        name: newRoomInDb.name,
        price_per_night: newRoomInDb.price_per_night
      })
    )
  })
  it('updates new name when given new name', async({ roomRepository }) => {
    // Arrange
    const newName = 'New Name'
    const testRoom = await createTestRoom({ name: 'Old name' })

    // Act
    const newRoom = await roomRepository.updateRoom(testRoom.id, { name: newName })

    // Assert
    expect(newRoom.name).toBe(newName)
    //Assert side effect
    const rowResult = await query(
      `
      SELECT name FROM rooms
      WHERE id=$1
      `,
      [testRoom.id]
    )
    expect(rowResult.rows[0].name).toBe(newName)
  })

  it('updates new pricePerNight when given new pricePerNight', async({ roomRepository }) => {
    // Arrange
    const pricePerNight = 1000.0
    const testRoom = await createTestRoom({ pricePerNight })

    // Act
    const newRoom = await roomRepository.updateRoom(testRoom.id, { price_per_night: pricePerNight })

    // Assert
    expect(newRoom.pricePerNight).toBe(pricePerNight)
    //Assert side effect
    const rowResult = await query(
      `
      SELECT price_per_night FROM rooms
      WHERE id=$1
      `,
      [testRoom.id]
    )
    expect(Number(rowResult.rows[0].price_per_night)).toBe(pricePerNight)
  })
})
