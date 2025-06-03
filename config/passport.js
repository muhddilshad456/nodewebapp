const passport = require("passport");
const googleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

passport.use(
  new googleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://watch-sy.shop/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          googleId: profile.id,
        });

        if (user) {
          if (user.isBlocked) {
            return done(null, false, { message: "user is blocked" });
          }
          return done(null, user);
        } else {
          const userRefName = profile.displayName;
          const random = Math.floor(1000 + Math.random() * 9000);
          const referalCode = `${userRefName
            .substring(0, 3)
            .toUpperCase()}${random}`;

          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            referalCode,
          });
          await user.save();
          return done(null, user);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

module.exports = passport;
