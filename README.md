# SPG Corporate Website

Corporate website and recruitment platform draft for Công ty TNHH Chí Hùng (SPG), Tân Uyên, Bình Dương.

## Public-source notes

Public sources describe Chí Hùng as established in 2000 in Tân Uyên, Bình Dương and operating in footwear manufacturing, including sports shoes and related footwear components. These details should be confirmed by the company before production. [Source: Sports Gear group business page; public company directories]

## Structure

- `src/`: React frontend.
- `functions/api/jobs/`: jobs API.
- `functions/api/applications/`: application API.
- `functions/_shared/`: shared response helpers and sample data.
- `public/images/`: place for approved company-owned images.

## Free deployment

- Frontend/API: Cloudflare Pages Free.
- Database: MongoDB Atlas M0 Free.
- Build command: `npm run build`.
- Output directory: `dist`.
- Add `MONGODB_URI` as a Cloudflare secret only; never commit it.

The current API uses fallback data and does not persist applications until a MongoDB-compatible Cloudflare adapter is configured.