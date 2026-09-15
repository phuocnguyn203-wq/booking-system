export default class PaymentsController {
  constructor({ paymentService }) {
    this.paymentService = paymentService

    this.listCurrentUserPayments = this.listCurrentUserPayments.bind(this)
    this.getCurrentUserPayment = this.getCurrentUserPayment.bind(this)
    this.createCurrentUserPayment = this.createCurrentUserPayment.bind(this)
    this.getPaymentById = this.getPaymentById.bind(this)
    this.createPayment = this.createPayment.bind(this)
  }

  async listCurrentUserPayments(req, res, next) {
    try {
      const { items, total, page, limit } =
        await this.paymentService.listUserPayments(
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

  async getCurrentUserPayment(req, res, next) {
    try {
      const { paymentId } = req.validated.params
      const payment = await this.paymentService.getUserPaymentById(
        req.user.id,
        paymentId
      )

      return res.status(200).json({ data: payment })
    } catch (error) {
      return next(error)
    }
  }

  async createCurrentUserPayment(req, res, next) {
    try {
      const payment = await this.paymentService.createUserPayment(
        req.user.id,
        req.validated.body
      )

      return res.status(201).json({ data: payment })
    } catch (error) {
      return next(error)
    }
  }

  async getPaymentById(req, res, next) {
    try {
      const { paymentId } = req.validated.params
      const payment = await this.paymentService.getPaymentById(paymentId)

      return res.status(200).json({ data: payment })
    } catch (error) {
      return next(error)
    }
  }

  async createPayment(req, res, next) {
    try {
      const payment = await this.paymentService.createPayment(
        req.validated.body
      )

      return res.status(201).json({ data: payment })
    } catch (error) {
      return next(error)
    }
  }
}
