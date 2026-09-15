// routes/upload.js
// Handles file uploads (photos/videos for posts). Files are saved to the
// local /uploads folder and served back at /uploads/<filename>.
//
// This is the simplest possible setup - fine for development and small
// scale. When you're ready to go live with real users, swap the storage
// (the `multer.diskStorage` block below) for a cloud bucket like S3 or
// Cloudinary instead of the server's own disk, since local files don't
// survive redeploys on most hosts.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requireAuth } = require('./auth-middleware');

const router = express.Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
const MAX_SIZE_MB = 15;

// Same volume logic as db.js - keeps uploaded photos across redeploys
// when running on Railway with a volume attached.
const uploadDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
  : path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP, GIF, or MP4 files are allowed.'));
    }
    cb(null, true);
  }
});

// POST /api/upload - field name must be "file"
router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ url: fileUrl });
  });
});

module.exports = router;
