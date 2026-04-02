const router     = require('express').Router();
const passport   = require('passport');
const jwt        = require('jsonwebtoken');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { pool }   = require('../db/pool');

// Configure Google OAuth strategy
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
    accessType: 'offline',
    prompt: 'consent',  // always get refresh token
  },
  async (accessToken, refreshToken, params, profile, done) => {
    try {
      const expiry = new Date(Date.now() + params.expires_in * 1000);
      const { rows } = await pool.query(
        `INSERT INTO users (google_id, email, name, picture, access_token, refresh_token, token_expiry)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (google_id) DO UPDATE SET
           email         = EXCLUDED.email,
           name          = EXCLUDED.name,
           picture       = EXCLUDED.picture,
           access_token  = EXCLUDED.access_token,
           refresh_token = COALESCE(EXCLUDED.refresh_token, users.refresh_token),
           token_expiry  = EXCLUDED.token_expiry
         RETURNING id, email, name, picture`,
        [profile.id, profile.emails[0].value, profile.displayName, profile.photos[0]?.value, accessToken, refreshToken, expiry]
      );
      done(null, rows[0]);
    } catch (err) {
      done(err);
    }
  }
));

// Sign in with Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
  accessType: 'offline',
  prompt: 'consent',
  session: false,
}));

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}?auth=error` }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, name: req.user.name, picture: req.user.picture },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    // Send token via cookie so frontend can read it securely
    res.cookie('dd_token', token, {
      httpOnly: false,    // frontend needs to read it
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${process.env.CLIENT_URL}?auth=success`);
  }
);

// GET /auth/me — return current user from token
router.get('/me', (req, res) => {
  const token = req.cookies?.dd_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.json({ user: null });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('dd_token', { secure: true, sameSite: 'none' });
  res.json({ success: true });
});

module.exports = router;
