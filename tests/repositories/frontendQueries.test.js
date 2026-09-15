import { describe, expect } from 'vitest'
import { it as baseIt } from 'vitest'
import { query } from '../../src/database/index.js'
import BookingRepository from '../../src/app/repositories/bookings.repository.js'
import PaymentRepository from '../../src/app/repositories/payments.repository.js'
import RoomRepository from '../../src/app/repositories/rooms.repository.js'
import {
  cleanBeforeEachAndAfterAll,
  createTestBooking,
  createTestPayment,
  createTestRoom,
  createTestRoomType,
  createTestUser
} from './testHelper.js'

const it = baseIt.extend('repositories', () => ({
  bookings: new BookingRepository(query),
  payments: new PaymentRepository(query),
  rooms: new RoomRepository(query)
}))

await cleanBeforeEachAndAfterAll()

describe('RoomRepository [findAvailable]', () => {
  it('filters capacity and overlapping active bookings with pagination', async ({ repositories }) => {
    // Arrange
    const roomType = await createTestRoomType({
      capacity: 2,
      pricePerNight: '120.00'
    })
    const bookedRoom = await createTestRoom({
      roomTypeId: roomType.id,
      roomNumber: 'BOOKED-101'
    })
    const availableRoom = await createTestRoom({
      roomTypeId: roomType.id,
      roomNumber: 'AVAILABLE-102'
    })
    const user = await createTestUser()
    await createTestBooking({
      userId: user.id,
      roomId: bookedRoom.id,
      checkInDate: '2030-01-10',
      checkOutDate: '2030-01-12',
      status: 'confirmed'
    })

    // Act
    const result = await repositories.rooms.findAvailable({
      checkInDate: '2030-01-11',
      checkOutDate: '2030-01-13',
      capacity: 2,
      limit: 20,
      offset: 0
    })
    const emptyPage = await repositories.rooms.findAvailable({
      checkInDate: '2030-01-11',
      checkOutDate: '2030-01-13',
      capacity: 2,
      limit: 20,
      offset: 20
    })

    // Assert
    expect(result.total).toBe(1)
    expect(result.items).toEqual([
      expect.objectContaining({
        id: availableRoom.id,
        roomNumber: availableRoom.roomNumber,
        roomType: expect.objectContaining({
          id: roomType.id,
          capacity: 2,
          pricePerNight: '120.00'
        })
      })
    ])
    expect(emptyPage).toEqual({ total: 1, items: [] })
  })
})

describe('BookingRepository [customer ownership]', () => {
  it('lists and finds bookings only for the specified user', async ({ repositories }) => {
    // Arrange
    const owner = await createTestUser()
    const otherUser = await createTestUser({
      email: 'other-booking-user@example.com',
      username: 'other-booking-user'
    })
    const ownerRoom = await createTestRoom()
    const otherRoom = await createTestRoom()
    const ownerBooking = await createTestBooking({
      userId: owner.id,
      roomId: ownerRoom.id,
      status: 'pending'
    })
    const otherBooking = await createTestBooking({
      userId: otherUser.id,
      roomId: otherRoom.id,
      status: 'pending'
    })

    // Act
    const list = await repositories.bookings.findByUserId(owner.id, {
      limit: 20,
      offset: 0
    })
    const emptyPage = await repositories.bookings.findByUserId(owner.id, {
      limit: 20,
      offset: 20
    })
    const owned = await repositories.bookings.findByIdForUser(
      ownerBooking.id,
      owner.id
    )
    const hidden = await repositories.bookings.findByIdForUser(
      otherBooking.id,
      owner.id
    )

    // Assert
    expect(list).toMatchObject({ total: 1, items: [ownerBooking] })
    expect(emptyPage).toEqual({ total: 1, items: [] })
    expect(owned).toEqual(ownerBooking)
    expect(hidden).toBeNull()
  })

  it('cancels only an active booking owned by the specified user', async ({ repositories }) => {
    // Arrange
    const owner = await createTestUser()
    const otherUser = await createTestUser({
      email: 'other-cancel-user@example.com',
      username: 'other-cancel-user'
    })
    const booking = await createTestBooking({
      userId: owner.id,
      roomId: (await createTestRoom()).id,
      status: 'confirmed'
    })

    // Act
    const denied = await repositories.bookings.cancelByIdForUser(
      booking.id,
      otherUser.id
    )
    const cancelled = await repositories.bookings.cancelByIdForUser(
      booking.id,
      owner.id
    )

    // Assert
    expect(denied).toBe(false)
    expect(cancelled).toBe(true)
    const rowResult = await query(
      'SELECT status FROM bookings WHERE id=$1',
      [booking.id]
    )
    expect(rowResult.rows[0].status).toBe('cancelled')
  })
})

describe('PaymentRepository [customer ownership]', () => {
  it('calculates amount from the owned booking instead of client input', async ({ repositories }) => {
    // Arrange
    const owner = await createTestUser()
    const roomType = await createTestRoomType({ pricePerNight: '120.00' })
    const room = await createTestRoom({ roomTypeId: roomType.id })
    const booking = await createTestBooking({
      userId: owner.id,
      roomId: room.id,
      checkInDate: '2030-01-10',
      checkOutDate: '2030-01-12',
      status: 'confirmed'
    })

    // Act
    const payment = await repositories.payments.createForUser(owner.id, {
      bookingId: booking.id,
      method: 'card',
      provider: 'stripe',
      idempotencyKey: 'owned-payment-1'
    })

    // Assert
    expect(payment).toMatchObject({
      bookingId: booking.id,
      amount: '240.00',
      currency: 'VND',
      status: 'pending'
    })
  })

  it('lists and finds payments only through bookings owned by the user', async ({ repositories }) => {
    // Arrange
    const owner = await createTestUser()
    const otherUser = await createTestUser({
      email: 'other-payment-user@example.com',
      username: 'other-payment-user'
    })
    const ownerBooking = await createTestBooking({
      userId: owner.id,
      roomId: (await createTestRoom()).id,
      status: 'confirmed'
    })
    const otherBooking = await createTestBooking({
      userId: otherUser.id,
      roomId: (await createTestRoom()).id,
      status: 'confirmed'
    })
    const ownerPayment = await createTestPayment({ bookingId: ownerBooking.id })
    const otherPayment = await createTestPayment({ bookingId: otherBooking.id })

    // Act
    const list = await repositories.payments.findByUserId(owner.id, {
      limit: 20,
      offset: 0
    })
    const emptyPage = await repositories.payments.findByUserId(owner.id, {
      limit: 20,
      offset: 20
    })
    const owned = await repositories.payments.findByIdForUser(
      ownerPayment.id,
      owner.id
    )
    const hidden = await repositories.payments.findByIdForUser(
      otherPayment.id,
      owner.id
    )

    // Assert
    expect(list).toMatchObject({ total: 1, items: [ownerPayment] })
    expect(emptyPage).toEqual({ total: 1, items: [] })
    expect(owned).toEqual(ownerPayment)
    expect(hidden).toBeNull()
  })
})
