// routes/auth.js
// Handles account creation and login. Passwords are hashed with bcrypt
// before storage - the plain password is never saved anywhere.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { requireAuth, JWT_SECRET } = require('./auth-middleware');

const router = express.Router();
const AVATAR_COLORS = ['#D85A30', '#D4537E', '#7F77DD', '#1D9E75'];

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { username, email, password, full_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Username or email is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).run(username, email, passwordHash, full_name || username, avatarColor);

  const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, username, email, full_name: full_name || username }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name }
  });
});

// GET /api/auth/me - returns the logged-in user's own profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, full_name, bio, avatar_color FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

// PUT /api/auth/me - update your own profile (full name, bio)
router.put('/me', requireAuth, (req, res) => {
  const { full_name, bio } = req.body;
  db.prepare('UPDATE users SET full_name = ?, bio = ? WHERE id = ?')
    .run(full_name ?? '', bio ?? '', req.userId);
  const user = db.prepare('SELECT id, username, email, full_name, bio, avatar_color FROM users WHERE id = ?').get(req.userId);
  res.json(user);
});

module.exports = router;
