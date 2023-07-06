// any error occured comes to this file
// categories errors into 2 categories - isOperational and others
// isOperational errors are those that happen due to user's error and about which we want to inform user as to what happened
// other errors are those that are not not user's fault, they are maybe some programming fault or some other failure. We don't want to
// provide details of that to the user.
// Errors are marked as isOperational in the AppError class
// So any error coming from the AppError class is already marked isOperational
// But there are some errors that does not come through AppError class but they come in isOperational category, for e.g., mongoose schema
// validation errors.
// so we handle them here in this file. We create a new err object by passing it through AppError class and thus marking them
// as isOperational(see at the end of each if block)
// at the end, we check if the error is isOperational. If it is, we send a detailed error message, otherwise we just a generic message
// like "Something went wrong"

// ***Process to set new property to error response
// * No need to change AppError
// * add the field in the "response" object in this file. e.g. - newField: err.newField || (defaultValue)
// * Pass the newField when creating the error in an object as the last argument. e.g - new AppError("msg",400,{newField:"Hello"})
//
// ***Process to handle some particular error
// * add a "name" field when creating the error to identify it here , e.g, new AppError("msg",400,{name:"SpecialError"})
// * handle it here using err.name, just like all others

import AppError from "../utils/appError.js";

export default (err, req, res, next) => {
  console.log(err);
  err.statusCode = err.statusCode || 500;
  // err.message = err.message || "Internal Server Error";

  let response = {
    success: false,
    message: "",
    fields: err.fields || [],
    suggestions: err.suggestions || [],
    errorList: err.errorList || [],
  };
  console.log("Response : ", response);

  //schema validation error
  if (err.name === "ValidationError") {
    let errors = Object.keys(err.errors).map((error) => {
      // CastError is also a type of validation error
      if (err.errors[error].constructor.name === "CastError") {
        // prettier-ignore
        response.errorList.push(`Invalid ${err.errors[error].path} value.`);
        return `Invalid ${err.errors[error].path} value.`;
      } else {
        response.errorList.push(err.errors[error].message);
        return err.errors[error].message;
      }
    });
    Object.values(err.errors).forEach((el) => response.fields.push(el.path));
    console.log(response.fields);
    errors.forEach((error) => {
      response.message += ` ${error}`;
    });

    // to mark this error as isOperational
    err = new AppError(response.message, 400);
  }

  //mongoose duplicate key error
  if (err.code === 11000) {
    if (JSON.stringify(err.keyPattern) === JSON.stringify({ pg: 1, user: 1 })) {
      response.message += "You have already given review for this PG.";
    } else {
      // prettier-ignore
      response.message += `An account with that ${Object.keys(err.keyValue)} already exists.`;
    }

    // to mark this error as isOperational
    err = new AppError(response.message, 400);
  }
  //wrong JWT error
  if (err.name === "JsonWebTokenError") {
    response.message += `Json Web Token is invalid,try again.`;

    // to mark this error as isOperational
    err = new AppError(response.message, 400);
  }
  //JWT Expire error
  if (err.name === "Token Expired Error") {
    response.message += `Json Web Token is expired.`;

    // to mark this error as isOperational
    err = new AppError(response.message, 400);
  }

  if (err.name === "MulterError") {
    response.message += `You can upload maximum 50 pictures.`;

    // to mark this error as isOperational
    err = new AppError(response.message, 400);
  }

  // if (err.name === "WeakPassword") {
  //   //message set in userModel
  //   response.message = err.message.split(". ")[0];
  //   response.suggestions = err.message.split(". ");
  //   response.fields.push("password");
  //   // it come from AppError class, so it is already marked isOperational
  //   // err = new AppError(response.message, 400);
  // }
  // // when password does not satisfy validation criteria
  // if (err.name === "InvalidPassword") {
  //   //message set in userModel
  //   err.message.split(". ").forEach((el) => response.errorList.push(el));
  //   response.fields.push("password");
  //   // it come from AppError class, so it is already marked isOperational
  //   // err = new AppError(response.message, 400);
  // }

  if (err.isOperational) {
    response.message = response.message || err.message;
    if (response.errorList.length === 0)
      response.errorList.push(response.message);
  } else {
    response.message = "Something Went Wrong!";
  }
  // err = new AppError(response.message, 400);
  console.log(err);

  response.status = err.status;

  // to clear empty arrays or strings from response
  Object.keys(response).forEach((el) => {
    try {
      // try catch block needed bcz in future,we may set some property in response for which .length does not work, for e.g., an object
      if (response[el].length === 0) response[el] = undefined;
    } catch (error) {
      return; // works as continue statement, can't use continue in forEach loop
    }
  });

  // .send() used instead of .json() to display errors on frontend
  res.status(err.statusCode).send(response);
};
