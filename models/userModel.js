import crypto from "crypto";
import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import AppError from "../utils/appError.js";
import zxcvbn from "zxcvbn";
import owasp from "owasp-password-strength-test";

owasp.config({
  maxLength: 128,
  minLength: 8,
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "No name given!! Name required"],
    trim: true,
    minlength: [2, "Name must contain at least 2 letters."],
    maxLength: [50, "Please provide a shorter name."],
  },
  email: {
    type: String,
    required: [true, "No email given!! email required"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email."],
  },

  phone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, "Invalid phone number"],
  },
  about: {
    type: String,
    trim: true,
  },
  address: {
    locality: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true, lowercase: true },
    state: { type: String, trim: true, lowercase: true },
    pincode: {
      type: String,
      match: [/^[1-9][0-9]{5}$/, "Invalid pincode"],
    },
  },

  password: {
    type: String,
    required: [true, "Please enter a Password."],
    minlength: [8, "Password must contain at least 8 characters."],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your Password."],
    validate: {
      // THIS WORKS ON SAVE AND CREATE ONLY, NOT ON UPDATE
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords do not match",
    },
  },
  passwordChangedAt: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  refreshTokens: [String],

  // done above this

  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
  },
  role: {
    type: String,
    enum: ["user", "pgOwner"],
    default: "user",
  },
  // active: {
  //   type: Boolean,
  //   dafault: true,
  //   select: false,
  // },
});

userSchema.pre("save", async function (next) {
  // does not run if the password field is not modified
  if (!this.isModified("password")) return next();
  const validatePass = owasp.test(this.password);
  if (!validatePass.strong) {
    //prettier-ignore
    const msg = validatePass.errors.join(" ")
    return next(
      new AppError(msg, 400, {
        // name: "InvalidPassword",
        fields: ["password"],
        errorList: msg.split(". "),
      })
    );
  }
  const passwordStrength = zxcvbn(this.password, [this.name, this.email]);
  const minPasswordStrength = 3; // Minimum desired password strength

  if (passwordStrength.score < minPasswordStrength) {
    const suggestions = passwordStrength.feedback.suggestions.join(" ");
    return next(
      new AppError(`Password is too weak.`, 400, {
        // name: "WeakPassword",
        fields: ["password"],
        suggestions: suggestions.split(". "),
      })
    );
    // return next(new AppError(`Password is too weak. ${suggestions}`,400,{ name: "WeakPassword",field:"password" }));
  }
  // encrypts the password
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.comparePassword = async function (
  enteredPassword,
  Password
) {
  return await bcrypt.compare(enteredPassword, Password);
};

userSchema.methods.passwordChangedAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // this.passwordChangedAt is in form of date & JWTTimestamp is in millisec.so we convert this.passwordChangedAt in millisec
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimeStamp;
  }

  //if there is a no "passwordChangedAt" field in the user doc., we return "false"
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // console.log(resetToken);
  // console.log(this.passwordResetToken);
  return resetToken;
};

userSchema.index({ email: 1 });

const User = mongoose.model("User", userSchema);

export default User;
