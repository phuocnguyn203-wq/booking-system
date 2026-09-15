export default class PaymentsController {
  constructor({ paymentService }) {
    this.paymentService = paymentService

    this.getPaymentById = this.getPaymentById.bind(this)
    this.createPayment = this.createPayment.bind(this)
  }

  async getPaymentById(req, res, next) {
    try {
      const paymentId = Number(req.params.paymentId)
      const payment = await this.paymentService.getPaymentById(paymentId)

      return res.status(200).json({ data: payment })
    } catch (error) {
      return next(error)
    }
  }

  async createPayment(req, res, next) {
    try {
      const payment = await this.paymentService.createPayment(req.body)

      return res.status(201).json({ data: payment })
    } catch (error) {
      return next(error)
    }
  }
}
