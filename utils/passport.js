import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import User from "./../models/userModel.js";

function generateRandomPassword(length) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

// 4. Configure Passport.js with the Google authentication strategy

passport.use(
  new GoogleStrategy(
    {
      //prettier-ignore
      clientID:process.env.GOOGLE_OAUTH_CLIENT_ID,
      //prettier-ignore
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists in the database
        console.log(accessToken);
        console.log(refreshToken);
        console.log(profile);
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          // Create a new user record
          const password = generateRandomPassword(20);
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value, // Assuming the email is provided
            name: profile.displayName,
            // photo: profile.photos[0].value,
            password,
            passwordConfirm: password,
          });

          // Save the new user to the database
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
