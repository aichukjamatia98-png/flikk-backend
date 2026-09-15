// middleware/auth.js
// Checks the Authorization header for a valid JWT before letting a request
// through to a protected route. Attaches the logged-in user's id to req.userId.

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Login required.' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Log in again.' });
  }
}

module.exports = { requireAuth, JWT_SECRET };
