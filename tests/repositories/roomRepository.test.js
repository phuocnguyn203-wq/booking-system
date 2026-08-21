import { it, beforeEach, afterAll, expect, describe } from "vitest";

import RoomRepository from "../../src/app/repositories/rooms.repository.js";
import { query } from "../../src/database/index.js";


beforeEach(async () => {
  await query(`
    DELETE FROM users;
    DELETE FROM rooms;
    DELETE FROM bookings;
    `);
});

afterAll(async () => {
  await query(`
    DELETE FROM users;
    DELETE FROM rooms;
    DELETE FROM bookings;
    `)
})
/*
Room obj:
- id
- name
- price_per_night
- created_at
*/
async function createTestRoom({ name="Room 1", pricePerNight=200, deleted_at=null } = {}) {
  let result
  if (deleted_at === 'now'){
    result = await query(
      `
      INSERT INTO rooms (name, price_per_night, deleted_at)
      VALUES
      ($1, $2, NOW())
      RETURNING *;
      `,
      [name, pricePerNight],
    )
  } else {
    result = await query(
      `
      INSERT INTO rooms (name, price_per_night)
      VALUES
      ($1, $2)
      RETURNING *;
      `,
      [name, pricePerNight],
    )
  }

  const room = result.rows[0]
  return {
    id: room.id,
    name: room.name,
    pricePerNight: Number(room.price_per_night),
    created_at: Date(room.created_at),
    deleted_at: Date(room.deleted_at),
  }
}

describe('RoomRepository [findById]', () => {
  it('returns room object when given existed room id', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query);
    const testRoom = await createTestRoom();

    // Act
    const roomRetrieved = await roomRepository.findById(testRoom.id);

    // Arrange
    expect(roomRetrieved.id).toEqual(testRoom.id);
  })

  it('returns null when given non-exist room id', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
    const nonExistId = 10

    // Act
    const nonExistRoom = await roomRepository.findById(nonExistId)

    // Assert
    expect(nonExistRoom).toBeNull()
  })
})

describe('RoomRepository [createRoom]', () => {
  it('creates and returns room object', async () => {
    // Arrance
    const roomRepository = new RoomRepository(query)
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

  it('doesnot create and raises AppError when given duplicated name', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
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
  it('soft deletes and returns true if it\'s soft deleted when given room id', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
    const testRoom = await createTestRoom({})

    // Act
    const is_deleted = roomRepository.deleteById(testRoom.id)

    // Assert
    await expect(is_deleted).resolves.toBe(true)
    // Assert side effect
    const rowResult = await query(
      `
      SELECT id FROM rooms
      WHERE id=$1 AND deleted_at IS NOT NULL
      `,
      [testRoom.id]
    )
    expect(rowResult.rows.length).toBe(1)
  })

  it('returns false if it\'s already soft deleted or deleted permanently when given room id', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
    const testRoom = await createTestRoom({ deleted_at:'now' })

    // Act
    const is_deleted = await roomRepository.deleteById(testRoom.id)

    // Assert
    await expect(is_deleted).toBe(false)
  })
})

describe('Room Repository [updateRoom]', () => {
  it('updates both name and pricePerNight when given new value', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
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
  it('updates new name when given new name', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
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

  it('updates new pricePerNight when given new pricePerNight', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
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
