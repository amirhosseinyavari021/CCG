// server/auth/googleStrategy.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  JWT_SECRET,
} = process.env;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value;
        const googleId = profile.id;

        if (!email) {
          return done(new Error("Google did not return email"), null);
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            name,
            avatar,
            googleId,
            provider: "google",
            plan: "free",
          });
        } else {
          user.googleId = googleId;
          user.avatar = avatar || user.avatar;
          user.provider = "google";
          await user.save();
        }

        const token = jwt.sign(
          {
            id: user._id,
            email: user.email,
            name: user.name,
          },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        return done(null, { token });
      } catch (err) {
        console.error("Google Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);

export default passport;
