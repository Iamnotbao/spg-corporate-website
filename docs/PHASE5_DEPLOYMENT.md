# Mandora Phase 5 deployment cutover

Phase 5 removes the old SPG hostname from tracked SEO metadata and makes the canonical frontend origin a deployment setting.

## Cloudflare Pages

Set these production environment variables before deploying this branch:

- `VITE_SITE_URL` = the exact public Mandora frontend origin, without a trailing slash.
- `VITE_API_URL` = the existing Render API origin ending in `/api` (or the origin without `/api`; the frontend normalizes it).

If the current Cloudflare Pages hostname remains the production URL for this release, use that exact hostname for `VITE_SITE_URL`. If a Mandora custom domain or a new Pages hostname is introduced, use the new canonical origin instead. Do not invent a hostname in source code.

The Vite build now writes absolute `robots.txt` and `sitemap.xml` URLs from `VITE_SITE_URL`. Cloudflare builds fail when `VITE_SITE_URL` is missing so localhost cannot accidentally become the production canonical.

`public/_redirects` contains only known SPA route patterns. It deliberately does not rewrite every unknown path to `index.html`, so unrelated legacy/unknown paths can reach the real static `404.html` instead of becoming soft-404 Home responses. `public/_headers` adds `X-Robots-Tag: noindex, nofollow` to admin/auth/private student surfaces.

## Render backend

The backend API URL does not need to change merely because the site was rebranded.

If the frontend origin stays the same, keep the existing Render API hostname and current `FRONTEND_URL` value.

If the Cloudflare frontend origin changes, update Render `FRONTEND_URL` to include the new exact origin so CORS continues to work. The backend already accepts a comma-separated allowlist, so during a controlled hostname transition both the old and new frontend origins may be allowed temporarily.

Do not change `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, Cloudinary credentials, or the Render API hostname as part of SEO migration unless a separate infrastructure/security task requires it.

## Search Console cutover

After the production deployment:

1. Verify `/`, `/robots.txt`, `/sitemap.xml`, a public SPA deep link, a private route, and a random unknown route.
2. Confirm page source contains Mandora title/description/canonical/Open Graph metadata with the production origin.
3. Submit the production `/sitemap.xml` in Google Search Console.
4. Inspect the homepage and request indexing.
5. Inspect a few important public routes such as `/courses`, `/hsk`, and `/blog`.
6. Monitor old SPG URLs. Do not redirect unrelated career/company URLs to Mandora Home; they should disappear through real not-found handling unless a genuine equivalent is intentionally mapped.

Dynamic Course/Blog detail URLs are intentionally not fabricated into the build-time sitemap. They remain crawlable through internal links and canonical runtime metadata; a future API-backed sitemap can enumerate only real published records if needed.
