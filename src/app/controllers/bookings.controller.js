export default class BookingsController {
  constructor({ bookingService }) {
    this.bookingService = bookingService

    this.listCurrentUserBookings = this.listCurrentUserBookings.bind(this)
    this.getCurrentUserBooking = this.getCurrentUserBooking.bind(this)
    this.cancelCurrentUserBooking = this.cancelCurrentUserBooking.bind(this)
    this.getBookingById = this.getBookingById.bind(this)
    this.createBooking = this.createBooking.bind(this)
    this.updateBooking = this.updateBooking.bind(this)
    this.deactivateBooking = this.deactivateBooking.bind(this)
  }

  async listCurrentUserBookings(req, res, next) {
    try {
      const { items, total, page, limit } =
        await this.bookingService.listUserBookings(
          req.user.id,
          req.validated.query
        )

      return res.status(200).json({
        data: items,
        meta: { total, page, limit }
      })
    } catch (error) {
      return next(error)
    }
  }

  async getCurrentUserBooking(req, res, next) {
    try {
      const { bookingId } = req.validated.params
      const booking = await this.bookingService.getUserBookingById(
        req.user.id,
        bookingId
      )

      return res.status(200).json({ data: booking })
    } catch (error) {
      return next(error)
    }
  }

  async cancelCurrentUserBooking(req, res, next) {
    try {
      const { bookingId } = req.validated.params
      await this.bookingService.cancelUserBooking(req.user.id, bookingId)

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }

  async getBookingById(req, res, next) {
    try {
      const { bookingId } = req.validated.params
      const booking = await this.bookingService.getBookingById(bookingId)

      return res.status(200).json({ data: booking })
    } catch (error) {
      return next(error)
    }
  }

  async createBooking(req, res, next) {
    try {
      // Ownership comes from the verified token so a caller cannot create a
      // booking on behalf of another user by changing the request body.
      const bookingInfo = {
        ...req.validated.body,
        userId: req.user.id
      }
      const booking = await this.bookingService.createBooking(bookingInfo)

      return res.status(201).json({ data: booking })
    } catch (error) {
      return next(error)
    }
  }

  async updateBooking(req, res, next) {
    try {
      const { bookingId } = req.validated.params
      const booking = await this.bookingService.updateBooking(
        bookingId,
        req.validated.body
      )

      return res.status(200).json({ data: booking })
    } catch (error) {
      return next(error)
    }
  }

  async deactivateBooking(req, res, next) {
    try {
      const { bookingId } = req.validated.params
      await this.bookingService.deactivateBooking(bookingId)

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }
}
