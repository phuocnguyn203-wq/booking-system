import { beforeEach, afterAll } from 'vitest'
import { query } from '../../src/database/index.js'

const CLEAN_QUERY = `
  DELETE FROM bookings;
  DELETE FROM user_roles;
  DELETE FROM roles;
  DELETE FROM users;
  DELETE FROM rooms;
  DELETE FROM room_types;
`
export async function cleanBeforeEachAndAfterAll() {
  beforeEach(async () => {
    await query(CLEAN_QUERY)
  })

  afterAll(async() => {
    await query(CLEAN_QUERY)
  })
}

let roomTypeSequence = 0
let roomSequence = 0
// Room TEST -----------------------------------
export async function createTestRoomType(overrides={}) {
  const sequence = ++roomSequence

  const roomType = {
    code: `TEST_TYPE_${sequence}`,
    name: `Test Room Type ${sequence}`,
    pricePerNight: 120,
    capacity: 2,
    description: null,
    isDeleted: false,
    ...overrides
  }

  const rowResult = await query(
    `
    INSERT INTO room_types (code, name, price_per_night, capacity, description, is_deleted)
    VALUES
    ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      roomType.code,
      roomType.name,
      roomType.pricePerNight,
      roomType.capacity,
      roomType.description,
      roomType.isDeleted
    ]
  )
  const row = rowResult.rows[0]

  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    pricePerNight: Number(row.price_per_night),
    capacity: Number(row.capacity),
    description: row.description,
    isDeleted: row.is_deleted
  }
}

export async function createTestRoom(overrides = {}) {
  const sequence = ++roomSequence

  const {
    roomNumber = `TEST-${sequence}`,
    roomTypeId,
    floor=1,
    status='active',
    isDeleted=false

  } = overrides

  const effectiveRoomTypeId =
    roomTypeId ?? (await createTestRoomType()).id 
  const result = await query(
    `
    INSERT INTO rooms (room_number, room_type_id, floor, status, is_deleted)
    VALUES
    ($1, $2, $3, $4, $5)
    RETURNING *;
    `,
    [roomNumber, effectiveRoomTypeId, floor, status, isDeleted],
  )

  const row = result.rows[0]
  return {
    id: Number(row.id),
    roomNumber: row.room_number,
    roomTypeId: Number(row.room_type_id),
    floor: row.floor,
    status: row.status,
    isDeleted: row.is_deleted,
  }
}

// Role Test
let roleSequence = 0
export async function createTestRole(overrides = {}) {
  const sequence = ++roleSequence
  const {
    code= `test_role${sequence}`,
    name=`TEST ROLE ${sequence}`,
    description=null,
    isActive=true
  } = overrides

  const rowResult = await query(
    `
    INSERT INTO roles (code, name, description, is_active)
    VALUES
    ($1, $2, $3, $4)
    RETURNING *;
    `,
    [code, name, description, isActive]
  )
  const row = rowResult.rows[0]
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.is_active
  }
}


// User Test -----------------------------------
export async function createTestUser(overrides = {}) {

  const { 
    email='tester1@gmail.com',
    fullname='Tester User',
    username='test1',
    hashedPassword='faked-hashed-password',
    phone='0123456789',
    status='active',
    emailVerifiedAt=null,
    isDeleted=false,
  } = overrides
  const rowResult = await query(`
    INSERT INTO users (email, fullname, username, hashed_password, phone, status, email_verified_at, is_deleted)
    VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [email, fullname, username, hashedPassword, phone, status, emailVerifiedAt, isDeleted]
  )

  const row = rowResult.rows[0]
  return {
    id: Number(row.id),
    email: row.email,
    fullname: row.fullname,
    username: row.username,
    phone: row.phone,
    status: row.status,
    emailVerifiedAt: row.status || null,
    isDeleted: row.isDeleted
  }
}


// UserRole Test
export async function createTestUserRole({ userId, roleId }) {
  const rowResult = await query(
    `
    INSERT INTO user_roles (user_id, role_id)
    VALUES
    ($1, $2)
    RETURNING user_id, role_id, assigned_at
    `,
    [userId, roleId]
  )
  const row = rowResult.rows[0]

  return {
    userId: Number(row.user_id),
    roleId: Number(row.role_id),
    assignedAt: row.assigned_at
  }
}

export async function createTestUserRoleWrapper({ userId, roleIds }) {
  for (let roleId of roleIds)
    await createTestUserRole(userId, roleId)
}

// Booking Test -----------------------------------
export async function createTestBooking({ 
  userId,
  roomId, 
  checkInDate = new Date(Date.now() - 24 * 60 * 60 * 1000), 
  checkOutDate = new Date(Date.now()),
  status = 'completed',
  isDeleted = false
}) {
  const rowResult = await query(
    `
    INSERT INTO bookings (user_id, room_id, check_in, check_out, status, is_deleted)
    VALUES
    ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [userId, roomId, checkInDate, checkOutDate, status, isDeleted]
  )

  const booking = rowResult.rows[0]
  return {
    id: Number(booking.id),
    userId: Number(booking.user_id),
    roomId: Number(booking.room_id),
    checkInDate: booking.check_in,
    checkOutDate: booking.check_out
  }
}

// booking needs to have user and room so i create both user and room here
export async function createTestBookingWrapper({ 
  check_in=new Date(Date.now() - 24 * 60 * 60 * 1000), 
  check_out=new Date(), 
  status='cancelled',
  isDeleted=false
}={}) {
  const testRoom = await createTestRoom()
  const testUser = await createTestUser()
  const booking = await createTestBooking({
    userId: testUser.id,
    roomId: testRoom.id,
    checkInDate: check_in,
    checkOutDate: check_out,
    status: status,
    isDeleted: isDeleted
  })

  return booking
}
