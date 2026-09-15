// routes/messages.js
// Direct messages between two users. Simple polling-based chat for now -
// the client can call GET /api/messages/:username every few seconds to
// check for new messages. Swap to WebSockets/Socket.io later for real-time
// delivery without changing the data model.

const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth-middleware');

const router = express.Router();

// GET /api/messages - list conversations, most recent message first
router.get('/', requireAuth, (req, res) => {
  const conversations = db.prepare(`
    SELECT
      other.id as user_id,
      other.username,
      other.avatar_color,
      m.text as last_message,
      m.created_at as last_message_at,
      m.sender_id as last_sender_id
    FROM messages m
    JOIN users other ON other.id = CASE
      WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END
    WHERE m.id IN (
      SELECT MAX(id) FROM messages
      WHERE sender_id = ? OR recipient_id = ?
      GROUP BY CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END
    )
    ORDER BY m.created_at DESC
  `).all(req.userId, req.userId, req.userId, req.userId);

  res.json(conversations);
});

// GET /api/messages/:username - full message history with one person
router.get('/:username', requireAuth, (req, res) => {
  const other = db.prepare('SELECT id, username, avatar_color FROM users WHERE username = ?').get(req.params.username);
  if (!other) return res.status(404).json({ error: 'User not found.' });

  const messages = db.prepare(`
    SELECT id, sender_id, recipient_id, text, created_at
    FROM messages
    WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC
  `).all(req.userId, other.id, other.id, req.userId);

  res.json({ user: other, messages });
});

// POST /api/messages/:username - send a message to someone
router.post('/:username', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  const other = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!other) return res.status(404).json({ error: 'User not found.' });
  if (other.id === req.userId) return res.status(400).json({ error: "You can't message yourself." });

  const result = db.prepare(
    'INSERT INTO messages (sender_id, recipient_id, text) VALUES (?, ?, ?)'
  ).run(req.userId, other.id, text.trim());

  const message = db.prepare('SELECT id, sender_id, recipient_id, text, created_at FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(message);
});

module.exports = router;
