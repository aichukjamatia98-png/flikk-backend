// server.js
// Entry point - starts the Express server and mounts all the routes.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const path = require('path');
const authRoutes = require('./auth-routes');
const postRoutes = require('./posts-routes');
const userRoutes = require('./users-routes');
const uploadRoutes = require('./upload-routes');
const messageRoutes = require('./messages-routes');
const storyRoutes = require('./stories-routes');

const app = express();
app.use(cors());
app.use(express.json());

// Serves uploaded photos/videos, e.g. http://localhost:3000/uploads/abc123.jpg
const uploadDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Flikk backend running on http://localhost:${PORT}`);
});
