import { it, beforeEach, expect, describe } from "vitest";

import { RoomRepository } from "../../src/app/repositories/room.repository";
import { query } from "../../src/database/index.js";

import { AppError, createAppError } from "../../src/app/errors/AppError.js";

beforeEach(async () => {
  await query(`
    DELETE FROM users;
    DELETE FROM rooms;
    DELETE FROM bookings;
    `);
});
/*
Room obj:
- id
- name
- price_per_night
- created_at
*/
async function createTestRoom(name = "Room 1", price_per_night = 200) {
  const result = await query(
    `
    INSERT INTO rooms (name, price_per_night)
    VALUES
    ($1, $2)
    RETURNING *;
    `,
    [name, price_per_night],
  );

  return result.rows[0];
}

describe('RoomRepository [findById]', () => {
  it('returns room object when given existed room id', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query);
    const testRoom = await createTestRoom();

    // Act
    const roomRetrieved = await roomRepository.findById(testRoom.id);

    // Arrange
    expect(roomRetrieved).toEqual(expect.objectContaining(testRoom));
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
    expect(newRoom).toEqual(expect.objectContaining(testRoomInfo))
    // Assert side effect
    const resultRoomInDb = query(
      `
      SELECT id, name, price_per_night, created_at FROM rooms
      WHERE id=$1
      `,
      [newRoom.id]
    )
    const newRoomInDb = resultRoomIbDb.rows?.[0]
    expect(newRoomIbDb).toEqual(newRoom)
  })

  it('doesnot create and raises AppError when given duplicated name', async () => {
    // Arrange
    const roomRepository = new RoomRepository(query)
    const duplicatedName = 'My Room'
    const pricePerNight = 100
    const testRoom = new createTestRoom(duplicatedName)

    //Act
    const roomPromise = roomRepository.create({ 
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
