# Mandora Release Checklist

Use this checklist before treating the repository or deployment as portfolio-ready.

## 1. Local validation

Backend:

```bash
cd back-end
npm ci
npm test
```

Frontend:

```bash
cd front-end
npm ci
npm run lint
npm run build
npm run format:check
```

Repository:

```bash
node scripts/repo-security-check.mjs
```

For `format:check`, distinguish known legacy formatting debt from new failures. Do not hide new warnings/errors by reclassifying them as legacy.

## 2. End-to-end local QA

Public:

- Home loads without console/network errors.
- Course catalog uses real API data.
- Course detail shows ordered Units/Lessons.
- Published Lesson loads correctly.
- HSK/Vocabulary/Characters/Practice pages render responsive states.
- Blog list/detail work.
- Unknown route shows Not Found rather than Home.

Student:

- Register/Login.
- Enroll in a published Course.
- Duplicate enroll remains safe.
- My Courses displays progress.
- Normal Lesson completion is idempotent.
- Quiz Lesson cannot be manually completed.
- Failed Quiz preserves attempt and does not complete Lesson.
- Passing Quiz completes the Quiz Lesson and updates Course progress.
- Saved Vocabulary is owner-scoped.
- Leave Course archives Enrollment without deleting history.
- Re-enroll restores active Enrollment and prior progress.

Admin:

- Admin login/session works.
- Course/Unit/Lesson CRUD obeys publish/deletion rules.
- Vocabulary CRUD works.
- Quiz + Question builder works.
- Unsafe deletion with learning history is blocked.
- Blog/media retained workflows still function if enabled.
- Student/progress reporting is admin-only and uses real data.

## 3. SEO/build artifact QA

With production-like `VITE_SITE_URL` configured, inspect:

- `dist/index.html`
- `dist/robots.txt`
- `dist/sitemap.xml`
- `dist/_redirects`
- `dist/_headers`
- `dist/404.html`

Confirm:

- no old production hostname is emitted;
- canonical/OG URLs use the intended Mandora origin;
- admin/login/private student routes are noindex;
- unknown paths do not become a Home soft-404;
- sitemap contains only intended public static routes until dynamic sitemap coverage is implemented/verified.

## 4. Provider configuration

Cloudflare/frontend:

- `VITE_SITE_URL` is exact production frontend origin.
- `VITE_API_URL` points to the deployed backend API.
- deep links work after a hard refresh.
- 404 behavior is correct.

Render/backend:

- `NODE_ENV=production`.
- `FRONTEND_URL` contains the deployed frontend origin(s).
- `MONGODB_URI` and `MONGODB_DB` target the intended Mandora database.
- `JWT_SECRET` is strong and current.
- admin bootstrap password is strong/current.
- Cloudinary/OpenAI settings are configured only when required.

## 5. Security/history gate

Before making repository history a portfolio artifact:

- no tracked `.env`, key/certificate, production export, or generated dependency/build folder exists;
- automated repository safety check passes;
- reachable Git history has been reviewed for old credentials/configuration;
- suspected historical MongoDB/Cloudinary/JWT/admin credentials have been rotated/revoked;
- old applicant/CV/chat/private data is not present in the published tree/history;
- retained historical images/assets have publication rights;
- no license is claimed unless one is intentionally selected.

If old history cannot be confidently cleared, create a new clean Mandora repository from the reviewed current source tree instead of publishing the legacy history.

## 6. Portfolio polish

- root README describes the actual implemented product.
- repository name/description no longer present Mandora as the former SPG corporate product.
- real screenshots are captured after QA.
- screenshots contain no secrets/private user data.
- CI passes on the intended release branch.
- deployment links are added only after they are verified.

## 7. Google/Search Console cutover

After production deployment only:

- verify the canonical production URL;
- submit the new sitemap;
- inspect Home and representative Course/Blog URLs;
- request re-indexing for important pages;
- monitor old SPG results and redirect/404 behavior;
- do not block legacy URLs before Google can observe their final redirect/removal outcome.
