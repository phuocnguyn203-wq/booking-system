export default class AppError extends Errors {
  constructor(message, statusCode, code) {
    super(message)
    this.statusCode= statusCode
    this.code = code
  }
}

