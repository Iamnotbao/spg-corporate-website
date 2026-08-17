# SPG Corporate Website

Corporate website and recruitment platform for Công ty TNHH Chí Hùng (SPG), Tân Uyên, Bình Dương.

## Stack

- React + Vite
- Cloudflare Pages Functions
- MongoDB Atlas M0

## Local setup

```bash
npm install
npm run dev
```

For MongoDB local testing, create a local `.env` file containing `MONGODB_URI`, then run:

```bash
npm run test:mongodb
```

## API

- `GET /api/health`: checks API and MongoDB status without exposing secrets.
- `GET /api/jobs`: reads published jobs from MongoDB; uses fallback data if MongoDB is unavailable.
- `GET /api/posts`: reads published activity posts from MongoDB.
- `POST /api/applications`: validates and stores applications in MongoDB.

## Cloudflare deployment

Add `MONGODB_URI` as an encrypted Secret for both Production and Preview in the Cloudflare Pages project. Never commit the real URI to GitHub.

The database name is `spg`. Collections used are `jobs`, `posts`, and `applications`.