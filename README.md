# SPG Corporate Website

Corporate website for SPG with a careers page and Cloudflare Pages Functions API.

## Stack

- React + Vite
- Cloudflare Pages Functions
- MongoDB Atlas M0 (optional persistence)

## Run locally

```bash
npm install
npm run dev
```

## API

- `GET /api/jobs` returns job listings. It currently includes fallback data so the site works before MongoDB is configured.
- `POST /api/applications` accepts `jobId`, `name`, `email`, `phone`, and `message`.

## Free deployment

1. Create a MongoDB Atlas M0 cluster.
2. Deploy this repository as a Cloudflare Pages project.
3. Set `MONGODB_URI` in Cloudflare environment variables. Do not commit the real URI.
4. Configure the build command as `npm run build` and output directory as `dist`.

The current API intentionally uses fallback data and acknowledges applications without persistence until a MongoDB-compatible Cloudflare adapter is selected. This keeps the frontend deployable without secrets while the database is being configured.