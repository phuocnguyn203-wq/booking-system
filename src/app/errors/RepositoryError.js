export default class RepositoryError extends Error {
  constructor(code, { constraint, column, cause } = {}) {
    super(code)
    this.name = 'RepositoryError'
    this.code = code

    if (constraint !== undefined)
      this.constraint = constraint
    if (column !== undefined)
      this.column = column
    if (cause !== undefined)
      this.cause = cause
  }
}
