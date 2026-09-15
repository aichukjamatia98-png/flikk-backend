// routes/stories.js
// Stories disappear after 24 hours - there's no cleanup job needed, the
// GET query below just never returns anything older than that.

const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth-middleware');

const router = express.Router();

// GET /api/stories - active stories from people you follow, plus your own,
// grouped by user, newest-active-user first.
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.image_url, s.created_at, u.id as user_id, u.username, u.avatar_color
    FROM stories s
    JOIN users u ON u.id = s.user_id
    WHERE s.created_at > datetime('now', '-1 day')
      AND (
        s.user_id = ?
        OR s.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
      )
    ORDER BY s.created_at ASC
  `).all(req.userId, req.userId);

  const grouped = {};
  const order = [];
  for (const row of rows) {
    if (!grouped[row.username]) {
      grouped[row.username] = {
        username: row.username,
        user_id: row.user_id,
        avatar_color: row.avatar_color,
        stories: []
      };
      order.push(row.username);
    }
    grouped[row.username].stories.push({ id: row.id, image_url: row.image_url, created_at: row.created_at });
  }

  res.json(order.map(u => grouped[u]));
});

// POST /api/stories - add a new story
router.post('/', requireAuth, (req, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required.' });

  const result = db.prepare('INSERT INTO stories (user_id, image_url) VALUES (?, ?)').run(req.userId, image_url);
  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
