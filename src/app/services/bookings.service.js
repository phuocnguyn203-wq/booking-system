import createAppError, { AppError } from '../errors/AppError.js'
import Errors from '../errors/errorDefinitions.js'
import RepositoryError from '../errors/RepositoryError.js'

function mapRepositoryError(error) {
  if (
    error.code === 'FOREIGN_KEY_CONSTRAINT' &&
    error.constraint === 'bookings_user_fk'
  ) {
    return createAppError(Errors.USER_NOT_FOUND)
  }

  if (
    error.code === 'FOREIGN_KEY_CONSTRAINT' &&
    error.constraint === 'bookings_room_fk'
  ) {
    return createAppError(Errors.ROOM_NOT_FOUND)
  }

  if (
    error.code === 'NOT_NULL_CONSTRAINT' ||
    error.code === 'CHECK_CONSTRAINT'
  ) {
    return createAppError(Errors.INVALID_BOOKING_DATA)
  }

  if (
    error.code === 'EXCLUSION_CONSTRAINT' &&
    error.constraint === 'bookings_no_overlapping_active_reservations'
  ) {
    return createAppError(Errors.BOOKING_DATES_OVERLAP)
  }

  if (error.code === 'NO_UPDATABLE_FIELDS')
    return createAppError(Errors.NO_BOOKING_FIELDS_TO_UPDATE)

  return createAppError(Errors.DATA_ACCESS_ERROR)
}

function throwServiceError(error) {
  if (error instanceof AppError)
    throw error

  if (error instanceof RepositoryError)
    throw mapRepositoryError(error)

  throw error
}

export default class BookingService {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository
  }

  async getBookingById(bookingId) {
    try {
      const booking = await this.bookingRepository.findById(bookingId)

      if (booking === null)
        throw createAppError(Errors.BOOKING_NOT_FOUND)

      return booking
    } catch (error) {
      throwServiceError(error)
    }
  }

  async createBooking(bookingInfo) {
    try {
      return await this.bookingRepository.createBooking(bookingInfo)
    } catch (error) {
      throwServiceError(error)
    }
  }

  async updateBooking(bookingId, updateInfo) {
    const updatableFields = ['checkInDate', 'checkOutDate', 'status']
    const filteredUpdate = {}

    for (const field of updatableFields) {
      if (updateInfo?.[field] !== undefined)
        filteredUpdate[field] = updateInfo[field]
    }

    if (Object.keys(filteredUpdate).length === 0)
      throw createAppError(Errors.NO_BOOKING_FIELDS_TO_UPDATE)

    try {
      const booking = await this.bookingRepository.updateBooking(
        bookingId,
        filteredUpdate
      )

      if (booking === null)
        throw createAppError(Errors.BOOKING_NOT_FOUND)

      return booking
    } catch (error) {
      throwServiceError(error)
    }
  }

  async deactivateBooking(bookingId) {
    try {
      return await this.bookingRepository.deleteById(bookingId)
    } catch (error) {
      throwServiceError(error)
    }
  }
}
