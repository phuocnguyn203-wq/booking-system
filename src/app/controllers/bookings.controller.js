export default class BookingsController {
  constructor({ bookingService }) {
    this.bookingService = bookingService

    this.getBookingById = this.getBookingById.bind(this)
    this.createBooking = this.createBooking.bind(this)
    this.updateBooking = this.updateBooking.bind(this)
    this.deactivateBooking = this.deactivateBooking.bind(this)
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
