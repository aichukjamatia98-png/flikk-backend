# Flikk backend

A starter backend for the Flikk app — users, posts, likes, comments, follows, and notifications.

Note: this version keeps every file at the top level (no subfolders) to make uploading to GitHub from a phone easier.

## Setup

```
npm install
npm start
```

Server runs at `http://localhost:3000`. A `flikk.db` SQLite file is created automatically on first run — no separate database install needed.

## Endpoints

**Auth**
- `POST /api/auth/signup` — body: `{ username, email, password, full_name }`
- `POST /api/auth/login` — body: `{ username, password }`
- `GET /api/auth/me` — needs `Authorization: Bearer <token>`
- `PUT /api/auth/me` — update your own profile — body: `{ full_name, bio }`

**Upload**
- `POST /api/upload` — form-data with a `file` field (jpg, png, webp, gif, or mp4, max 15MB). Returns `{ url }` — a path like `/uploads/abc123.jpg`.

**Posts**
- `GET /api/posts` — the feed
- `POST /api/posts` — body: `{ image_url, caption, location }`. Use the `url` from `/api/upload` as `image_url`.
- `PUT /api/posts/:id` — edit your own post's caption/location
- `DELETE /api/posts/:id` — delete your own post
- `POST /api/posts/:id/like` — toggles like on/off
- `GET /api/posts/:id/comments`
- `POST /api/posts/:id/comments` — body: `{ text }`

**Users**
- `GET /api/users/:username` — profile + their posts
- `GET /api/users/search/:query` — find users by username (for search/explore)
- `POST /api/users/:username/follow` — toggles follow on/off
- `GET /api/users/me/notifications`

All routes except signup/login need the `Authorization: Bearer <token>` header — you get the token back from signup or login.

**Stories**
- `GET /api/stories` — active stories (posted in the last 24h) from you and people you follow, grouped by user
- `POST /api/stories` — body: `{ image_url }` — upload the image first via `/api/upload`, then post its URL here

**Messages**
- `GET /api/messages` — list of conversations (most recent first)
- `GET /api/messages/:username` — full chat history with that person
- `POST /api/messages/:username` — body: `{ text }` — send a message

## Deploying to Railway

1. Push this folder to a GitHub repo.
2. Go to [railway.app](https://railway.app), sign in with GitHub, and create a new project from that repo. Railway auto-detects the Node.js app.
3. In the project's Variables tab, set `JWT_SECRET` to a long random string (generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. Add a Volume in Railway and mount it at `/data` — this keeps your database and uploaded photos safe across redeploys. Set the `RAILWAY_VOLUME_MOUNT_PATH` variable to `/data` (Railway does this automatically once a volume is attached).
5. Deploy. Railway gives you a public URL — use it as `BASE_URL` in `api.js` on your frontend.

## Next steps
- Image uploads are stored locally in /uploads — fine for development. Move to a cloud bucket like S3 or Cloudinary before deploying for real users, since local files don't survive redeploys on most hosts.
- Messages currently work by polling `GET /api/messages/:username` every few seconds. For instant delivery, add WebSockets (Socket.io) later — the data model stays the same.
- Move from SQLite to Postgres when you're ready to deploy for real users.
- Host it: Railway, Render, or Fly.io all support this Express + SQLite setup with minimal changes.
