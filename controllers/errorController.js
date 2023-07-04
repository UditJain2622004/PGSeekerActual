import AppError from "./../utils/appError.js";

export default (err, req, res, next) => {
  console.log(err);
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";
  let message = "";
  let errorList = [];
  let fields = [];

  //schema validation error
  if (err.name === "ValidationError") {
    let errors = Object.keys(err.errors).map((error) => {
      // CastError is also a type of validation error
      if (err.errors[error].constructor.name !== "CastError") {
        errorList.push(err.errors[error].message);
        return err.errors[error].message;
      } else {
        // prettier-ignore
        errorList.push(`Resources not found.Invalid "${err.errors[error].path}.`);
        return `Resources not found.Invalid "${err.errors[error].path}.`;
      }
    });
    fields = Object.values(err.errors).map((el) => el.path);
    console.log(fields);
    errors.forEach((error) => {
      message += `${error}`;
    });
  }

  //mongoose duplicate key error
  if (err.code === 11000) {
    // prettier-ignore
    message += `An account with that ${Object.keys(err.keyValue)} already exists.`;
    // err = new AppError(message, 400);
  }
  //wrong JWT error
  if (err.name === "JsonWebTokenError") {
    message += `Json Web Token is invalid,try again.`;
    // err = new AppError(message, 400);
  }
  //JWT Expire error
  if (err.name === "Token Expired Error") {
    message += `Json Web Token is expired.`;
    // err = new AppError(message, 400);
  }

  if (err.name === "MulterError") {
    message += `You can upload maximum 50 pictures.`;
    // err = new AppError(message, 400);
  }

  message = message || "Internal Server Error";
  // console.log(errorList);
  err = new AppError(message, 400);
  console.log(err);
  // .send() used instead of .json() to display errors on frontend
  res.status(err.statusCode).send({
    status: err.status,
    success: false,
    message: err.message,
    errorList,
    fields,
  });
};
