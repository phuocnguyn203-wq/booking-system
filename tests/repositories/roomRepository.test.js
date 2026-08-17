import { it, beforeEach, expect, describe } from "vitest";

import { RoomRepository } from "../../src/app/repositories/room.repository";
import { query } from "../../src/database/index.js";

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

