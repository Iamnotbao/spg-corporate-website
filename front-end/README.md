# Mandora Frontend

React/Vite frontend for Mandora, a Chinese-learning platform for Vietnamese learners.

The application currently includes the public learning experience, student authentication and learning flows, and the admin CMS for learning content/reporting.

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:5173`.

Recommended local environment:

```env
VITE_API_URL=http://localhost:10000/api
VITE_SITE_URL=http://localhost:5173
```

`VITE_API_URL` may also be supplied as the backend origin without `/api`; the shared HTTP client normalizes it.

## Current product surfaces

### Public

- Home
- Courses
- Course Detail
- Lesson
- HSK
- Vocabulary
- Characters
- Practice
- Blog
- Not Found

### Student

- Register/Login
- My Courses
- Enrollment/leave/re-enroll
- Continue Learning
- Lesson completion
- Quiz attempts/results
- Saved Vocabulary
- Progress

### Admin

- Dashboard
- Courses
- Units
- Lessons
- Vocabulary
- Quizzes and Question builder
- Blog/content
- Students/accounts
- Progress/reporting
- retained media/CMS tools where still supported

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run format:check
```

## Structure

```text
src/
├── app/                  App providers and routing
├── components/           Shared UI
├── constants/            Shared navigation/constants
├── features/
│   ├── admin/            Admin CMS and reporting
│   ├── auth/             Student auth
│   ├── blog/             Public Blog
│   ├── courses/          Courses and Lessons
│   ├── learning/         HSK, Vocabulary, Characters, Practice
│   ├── public/           Home/public shell
│   ├── quizzes/          Student Quiz flow
│   └── student/          My Courses and Progress
├── hooks/                Shared hooks including SEO metadata
├── layouts/              Public/Auth/Student layouts
├── services/             Shared API client/admin services
├── styles/               Global design tokens/styles
└── main.jsx              Entry point
```

## SEO/deployment

Production builds require `VITE_SITE_URL` so canonical URLs, Open Graph URLs, robots and sitemap output use the real frontend origin.

Cloudflare Pages-specific `_redirects`, `_headers`, and `404.html` are emitted from `public/`. See `../docs/PHASE5_DEPLOYMENT.md` for the current deployment contract.

## Validation

```bash
npm run lint
npm run build
npm run format:check
```

A successful production build should contain `dist/index.html`, `dist/robots.txt`, `dist/sitemap.xml`, `dist/_redirects`, `dist/_headers`, and `dist/404.html`.

Do not commit `.env`, `.env.local`, generated `dist/`, or production secrets.
