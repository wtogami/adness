var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    smfAuth = require('./integration/smf-auth');

var users = {};
// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(id, done) {
  var user = users[id];
  if (user) done(null, user);
  else done(null, false);
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    process.nextTick(function () {
      smfAuth.authenticate(username, password, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false);
        }
        else {
          users[user.username] = user;
          return done(null, user);
        }
      });
    });
  }
));

module.exports = passport;
