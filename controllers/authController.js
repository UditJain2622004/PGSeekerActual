import crypto from "crypto";
import util from "util";
import jwt from "jsonwebtoken";
import pug from "pug";

import User from "./../models/userModel.js";
import AppError from "../utils/appError.js";
import Email from "./../utils/email.js";

///////////////////////////////////////////////////////////
// for using __dirname (to render html while sending email)
// can remove if changing email setup
import path, { dirname } from "path";
import { fileURLToPath } from "url";
// __dirname is not available in ES6 module. This is a work around that
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
////////////////////////////////////////////////////////////////////////////////

const removeRefreshTokenFromDB = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const decodedId = jwt.decode(refreshToken)?.id;

    if (!refreshToken || !decodedId) {
      // Handle case when refreshToken or decodedId is missing
      return false;
    }
    const user = await User.findByIdAndUpdate(
      decodedId,
      { $pull: { refreshTokens: { $in: [req.cookies.refreshToken] } } },
      { new: true }
    );
    if (!user) return false;

    return true;
  } catch (err) {
    next(err);
  }
};

const verifyAccessToken = async (req, res, next, accessToken) => {
  try {
    const decoded = await util.promisify(jwt.verify)(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );
    return decoded;
  } catch (err) {
    // if accessToken expired, generate new accessToken using refreshToken
    // console.log(err);
    if (err.name === "TokenExpiredError") {
      console.log("Generating new Access Token...");
      const newAccessToken = await generateNewAccessToken(req, res, next);
      // if no response from refreshToken function, means refresh token is also expired or invalid
      if (!newAccessToken) {
        // next(
        //   new AppError("Your session has expired. Please log in again.", 401)
        // );
        // return null;

        //prettier-ignore
        const errorA = new Error("Your session has expired. Please log in again.");
        throw errorA;
      }
      const decoded = await util.promisify(jwt.verify)(
        newAccessToken,
        process.env.ACCESS_TOKEN_SECRET
      );
      return decoded;
    } else {
      //prettier-ignore
      const errorB = new Error("Your session has expired. Please log in again.");
      throw errorB;
      // next(new AppError("Invalid token.", 401));
      // return null;
    }
  }
};

const signAccessToken = (id) => {
  return jwt.sign({ id: id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id: id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });
};

const createSendToken = async (user, statusCode, req, res, next) => {
  try {
    console.log(user);
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    console.log(accessToken);
    const accessTokenCookieOptions = {
      expires: new Date(
        Date.now() + process.env.ACCESS_TOKEN_COOKIE_EXPIRES_IN * 60 * 1000
      ),
      domain: "localhost",
      // httpOnly: true,
      // secure:true
    };
    const refreshTokenCookieOptions = {
      expires: new Date(
        Date.now() +
          process.env.REFRESH_TOKEN_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      domain: "localhost",
      // httpOnly: true,
      // secure:true
    };

    //   if (req.secure || req.headers["x-forwarded-proto"] === "https")

    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    await User.findByIdAndUpdate(
      user._id,
      { $push: { refreshTokens: refreshToken } }
      // { new: true }
    );

    if (req.cookies?.refreshToken) {
      try {
        await removeRefreshTokenFromDB(req, res, next);
      } catch (error) {}
    }
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(statusCode).json({
      status: "success",
      data: {
        user: user,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const signup = async (req, res, next) => {
  try {
    console.log(req.body);
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      // role: req.body.role,
    });
    console.log(newUser);

    // const url = `${req.protocol}://${req.get("host")}/me`;
    // await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, req, res, next);
  } catch (err) {
    next(err);
  }
};

export const logIn = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    console.log(email, password);

    // 1) Check if email & password are given in request
    if (!req.body.email || !req.body.password) {
      return next(new AppError("Please provide email and password", 400));
    }
    // 2) Check if user exists & password is correct
    const user = await User.findOne({ email: email }).select("+password");

    if (!user || !(await user.comparePassword(password, user.password))) {
      return next(new AppError("Incorrect email or password!!", 401));
    }
    // 3) If everything ok, send token to client
    createSendToken(user, 200, req, res, next);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    // const refreshToken = req.cookies?.refreshToken;
    // const decodedId = jwt.decode(refreshToken)?.id;

    // if (!refreshToken || !decodedId) {
    //   // Handle case when refreshToken or decodedId is missing
    //   return next(new AppError("Invalid Refresh Token", 400));
    // }
    // const user = await User.findByIdAndUpdate(
    //   decodedId,
    //   { $pull: { refreshTokens: { $in: [req.cookies.refreshToken] } } },
    //   { new: true }
    // );
    // if (!user) return next(new AppError("No document found with that id", 404));

    const tokenRemoved = await removeRefreshTokenFromDB(req, res, next);
    if (!tokenRemoved) return next(new AppError("Invalid Request", 400));

    res.cookie("accessToken", "", {
      expires: new Date(Date.now() + 1000),
      httpOnly: true,
    });
    res.cookie("refreshToken", "", {
      expires: new Date(Date.now() + 1000),
      httpOnly: true,
    });

    res.status(200).json({
      status: "success",
    });
  } catch (err) {
    next(err);
  }
};

export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token) {
      return next(
        new AppError("You are not logged in. Please log in to get access.", 401)
      );
    }

    // Verification token  ====================================================================================
    // let decoded;
    // try {
    //   decoded = await util.promisify(jwt.verify)(
    //     token,
    //     process.env.ACCESS_TOKEN_SECRET
    //   );
    // } catch (err) {
    //   // if token expired, generate new accessToken using refreshToken
    //   if (err.name === "TokenExpiredError") {
    //     console.log("Yes");
    //     const newAccessToken = await refreshToken(req, res, next);
    //     // if no response from refreshToken function, means refresh token is also expired or invalid
    //     if (!newAccessToken) {
    //       return next(
    //         new AppError("Your session has expired. Please log in again.", 401)
    //       );
    //     }
    //     decoded = await util.promisify(jwt.verify)(
    //       newAccessToken,
    //       process.env.ACCESS_TOKEN_SECRET
    //     );
    //   } else {
    //     return next(new AppError("Invalid token.", 401));
    //   }
    // }
    let decoded;
    try {
      decoded = await verifyAccessToken(req, res, next, token);
    } catch (error) {
      return next(new AppError(error.message, 401));
    }
    // if (!decoded) return;

    // Check if user still exists  ==========================================================================
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists", 401)
      );
    }

    // Check if user changed password after JWT token was issued  ===========================================
    if (currentUser.passwordChangedAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password. Please log in again", 401)
      );
    }

    // Grant access to PROTECTED ROUTE  =============================================================================
    req.user = currentUser;
    // res.locals.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

const generateNewAccessToken = async (req, res, next) => {
  try {
    let refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return null;
    }

    // Verification refreshToken  ====================================================================================
    let decoded;
    try {
      decoded = await util.promisify(jwt.verify)(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      //**************
      // CAN ALSO PUT A CHECK IF THE REFRESH TOKEN EXISTS IN THE USER DOCUMENT ASO
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        // If the refresh token is expired, remove it from the user's refreshTokens array
        // if token expired, decoded will be undefined bcz it uses jwt.verify
        // so we use jwt.decode() to get info. inside jwt without verifying it
        const decodedToken = jwt.decode(refreshToken);
        await User.findByIdAndUpdate(decodedToken.id, {
          $pull: { refreshTokens: { $in: [refreshToken] } },
        });
        return null;
      }
      throw err;
    }

    const user = User.findOne({ refreshTokens: { $in: [refreshToken] } });
    if (!user) return null;

    const accessToken = signAccessToken(decoded.id);
    res.cookie("accessToken", accessToken, {
      expires: new Date(
        Date.now() + process.env.ACCESS_TOKEN_COOKIE_EXPIRES_IN * 60 * 1000
      ),
      domain: "localhost",
      httpOnly: true,
    });
    return accessToken;
  } catch (err) {
    next(err);
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};
// ==================================================================================================================

export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return next(new AppError("There is no user with this email", 404));

    // Generate the random reset token
    const resetToken = await user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const resetUrl = `${req.protocol}://${req.get(
        "host"
      )}/api/v1/user/resetPassword/${resetToken}&${user.email}`;
      const html = pug.renderFile(`${__dirname}/../views/passwordReset.pug`, {
        firstName: user.name,
        url: resetUrl,
        subject: "Password reset",
      });
      console.log("yes");
      await Email({
        email: user.email,
        subject: "Your password reset token (Valid for 10 minutes only)",
        text: resetUrl,
        html: html,
      });
      console.log("yes");

      res.status(200).json({
        status: "success",
        message: "Token sent to email",
      });

      // if there was some error sending email, we should delete the token and expiry field
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          "There was an errror sending the email. Try again later.",
          500
        )
      );
    }
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      email: req.params.email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new AppError("Password Reset Token is invalid or expired.", 400)
      );
    }
    console.log(req.body);

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // clear all existing refreshTokens
    user.refreshTokens = [];
    await user.save();

    createSendToken(user, 200, req, res, next);
  } catch (err) {
    next(err);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    const password = req.body.currentPassword;
    if (!(await user.comparePassword(password, user.password))) {
      return next(new AppError("Wrong password", 401));
    }

    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // remove existing refreshToken for that device
    await removeRefreshTokenFromDB(req, res, next);
    createSendToken(user, 200, req, res, next);
  } catch (err) {
    next(err);
  }
};

// export const isLoggedIn = async (req, res, next) => {
//   try {
//     // console.log("Hello");
//     // console.log(req.cookies);
//     token = req.cookies.accessToken;

//     if (!token) {
//       return next(
//         new AppError("You are not logged in. Please log in to get access.", 401)
//       );
//     }

//     // Verification token  ====================================================================================
//     const decoded = await util.promisify(jwt.verify)(
//       token,
//       process.env.ACCESS_TOKEN_SECRET
//     );
//     // console.log(decoded);
//     // Check if user still exists  ==========================================================================
//     const currentUser = await User.findById(decoded.id);
//     if (!currentUser) {
//       return next(
//         new AppError("The user belonging to this token no longer exists", 401)
//       );
//     }

//     // Check if user changed password after JWT token was issued  ===========================================
//     if (currentUser.passwordChangedAfter(decoded.iat)) {
//       return next(
//         new AppError("User recently changed password. Please log in again", 401)
//       );
//     }

//     // Grant access to PROTECTED ROUTE  =============================================================================
//     req.user = currentUser;
//     // res.locals.user = currentUser;
//     res.status(200).json({
//       status: "success",
//     });
//     // next();
//   } catch (err) {
//     res.status(401).json({
//       status: "failure",
//     });
//   }
// };
