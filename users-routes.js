// routes/users.js
// Profile lookups, follow/unfollow, and the notifications list.

const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth-middleware');

const router = express.Router();

// GET /api/users/search/:query - find users by username (for the explore page)
router.get('/search/:query', requireAuth, (req, res) => {
  const q = `%${req.params.query}%`;
  const users = db.prepare(
    'SELECT username, full_name, avatar_color FROM users WHERE username LIKE ? AND id != ? LIMIT 20'
  ).all(q, req.userId);
  res.json(users);
});

// GET /api/users/:username - public profile + their posts
router.get('/:username', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, full_name, bio, avatar_color FROM users WHERE username = ?'
  ).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const followerCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(user.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').get(user.id).c;
  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(user.id).c;
  const isFollowing = !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.userId, user.id);

  const posts = db.prepare('SELECT id, image_url FROM posts WHERE user_id = ? ORDER BY created_at DESC').all(user.id);

  res.json({ ...user, followerCount, followingCount, postCount, isFollowing, posts });
});

// POST /api/users/:username/follow - toggle follow on/off
router.post('/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.userId) return res.status(400).json({ error: "You can't follow yourself." });

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.userId, target.id);

  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    return res.json({ following: false });
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.userId, target.id);
    db.prepare('INSERT INTO notifications (recipient_id, actor_id, type) VALUES (?, ?, ?)').run(target.id, req.userId, 'follow');
    return res.json({ following: true });
  }
});

// GET /api/users/me/notifications
router.get('/me/notifications', requireAuth, (req, res) => {
  const notifications = db.prepare(`
    SELECT n.id, n.type, n.is_read, n.created_at, n.post_id,
           u.username as actor_username, u.avatar_color as actor_color
    FROM notifications n
    JOIN users u ON u.id = n.actor_id
    WHERE n.recipient_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.userId);
  res.json(notifications);
});

module.exports = router;
