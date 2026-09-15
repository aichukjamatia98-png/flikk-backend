// routes/posts.js
// Feed, likes, and comments. Also fires a notification for the post owner
// whenever someone likes or comments (skipped if it's their own post).

const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth-middleware');

const router = express.Router();

function addNotification(recipientId, actorId, type, postId) {
  if (recipientId === actorId) return; // don't notify yourself
  db.prepare(
    'INSERT INTO notifications (recipient_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)'
  ).run(recipientId, actorId, type, postId);
}

// GET /api/posts - the main feed, newest first
router.get('/', requireAuth, (req, res) => {
  const posts = db.prepare(`
    SELECT p.id, p.image_url, p.caption, p.location, p.created_at,
           u.id as user_id, u.username, u.avatar_color,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
           EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as liked_by_me
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT 50
  `).all(req.userId);

  res.json(posts);
});

// POST /api/posts - create a new post
router.post('/', requireAuth, (req, res) => {
  const { image_url, caption, location } = req.body;
  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required.' });
  }

  const result = db.prepare(
    'INSERT INTO posts (user_id, image_url, caption, location) VALUES (?, ?, ?, ?)'
  ).run(req.userId, image_url, caption || '', location || '');

  res.status(201).json({ id: result.lastInsertRowid });
});

// POST /api/posts/:id/like - toggle a like on/off
router.post('/:id/like', requireAuth, (req, res) => {
  const postId = req.params.id;
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, req.userId);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    return res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, req.userId);
    addNotification(post.user_id, req.userId, 'like', postId);
    return res.json({ liked: true });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', requireAuth, (req, res) => {
  const comments = db.prepare(`
    SELECT c.id, c.text, c.created_at, u.username, u.avatar_color
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

// POST /api/posts/:id/comments - add a comment
router.post('/:id/comments', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)'
  ).run(req.params.id, req.userId, text.trim());

  addNotification(post.user_id, req.userId, 'comment', req.params.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/posts/:id - edit your own post's caption/location
router.put('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.userId) return res.status(403).json({ error: 'You can only edit your own posts.' });

  const { caption, location } = req.body;
  db.prepare('UPDATE posts SET caption = ?, location = ? WHERE id = ?')
    .run(caption ?? '', location ?? '', req.params.id);
  res.json({ ok: true });
});

// DELETE /api/posts/:id - delete your own post
router.delete('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.userId) return res.status(403).json({ error: 'You can only delete your own posts.' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
