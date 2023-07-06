class AppError extends Error {
  constructor(message, statusCode, others) {
    super(message);
    if (others) Object.keys(others).forEach((el) => (this[el] = others[el]));
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "failure" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
