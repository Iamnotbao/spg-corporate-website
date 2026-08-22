# Mandora

Mandora is a full-stack Chinese e-learning platform for Vietnamese learners. The current V1 focuses on structured learning through Courses, Units, Lessons, Vocabulary, Quizzes, enrollment, progress tracking, Blog content, and an admin CMS.

> Repository note: this codebase was repurposed from an earlier corporate-site project. The current product is Mandora; legacy corporate/recruitment modules are being retired or isolated as compatibility code where removing them would risk existing data or deployments.

## What is implemented

### Public

- Home and learning navigation
- Course catalog and Course detail
- Ordered Course → Unit → Lesson learning flow
- HSK, Vocabulary, Characters, Practice foundations
- Published Quiz delivery
- Blog and Blog detail
- Real not-found experience
- SEO metadata, canonical URLs, robots/sitemap generation, Cloudflare Pages redirects/headers

### Student

- Register and login
- Enroll in published Courses
- My Courses
- Explicit Lesson completion
- Continue Learning
- Saved Vocabulary
- Quiz attempts with server-side scoring
- Progress overview
- Non-destructive leave/re-enroll lifecycle

### Admin

- Protected admin workspace
- Course, Unit, Lesson, Vocabulary and Quiz management
- Quiz question builder
- Blog/content management
- Student/account management
- Learning progress and reporting summaries
- Media/upload tooling inherited from the existing CMS where still supported

## Stack

### Frontend

- React
- Vite
- React Router
- JavaScript

### Backend

- Node.js
- Express
- Native MongoDB driver
- JWT authentication
- Cloudinary integration for supported media workflows

The frontend and backend are independent packages; there is no root npm workspace.

## Repository structure

```text
.
├── front-end/              React/Vite application
├── back-end/               Express/MongoDB API
├── docs/                   Product, architecture, SEO and lifecycle decisions
├── scripts/                Repository safety checks
├── .github/workflows/      CI
└── AGENTS.md               Repository implementation rules
```

## Local setup

Use Node.js 22 for the same baseline as CI.

### 1. Backend

```bash
cd back-end
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell:

```powershell
cd back-end
npm ci
Copy-Item .env.example .env
npm run dev
```

Backend defaults to `http://localhost:10000` when `PORT=10000`.

Required local environment values are documented in `back-end/.env.example`. At minimum, configure a reachable MongoDB instance plus a strong local `JWT_SECRET` and admin password. Never commit `.env`.

### 2. Frontend

```bash
cd front-end
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell:

```powershell
cd front-end
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Recommended local values:

```env
VITE_API_URL=http://localhost:10000/api
VITE_SITE_URL=http://localhost:5173
```

Open `http://localhost:5173`.

## Important routes

### Frontend

- `/` — Home
- `/courses` — Course catalog
- `/courses/:courseSlug` — Course detail
- `/courses/:courseSlug/lessons/:lessonSlug` — Lesson
- `/vocabulary` — Vocabulary
- `/practice` — Practice
- `/blog` — Blog
- `/login` and `/register` — Student auth
- `/my-courses` — Student courses
- `/progress` — Student progress
- `/admin` — Admin CMS

### API

Examples of the V1 API surface:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/courses`
- `GET /api/courses/:identifier`
- `GET /api/lessons/:identifier`
- `POST /api/student/enrollments`
- `GET /api/student/courses`
- `PUT /api/student/lessons/:identifier/complete`
- `GET /api/student/progress`
- student Vocabulary and Quiz attempt routes under `/api/student/*`
- admin learning/reporting routes under `/api/admin/*`

See `docs/ARCHITECTURE.md` for the verified implementation details and lifecycle decisions.

## Validation

Backend:

```bash
cd back-end
npm test
```

Frontend:

```bash
cd front-end
npm run lint
npm run build
npm run format:check
```

Repository safety check:

```bash
node scripts/repo-security-check.mjs
```

CI runs backend tests, frontend lint/build, and the repository safety check. The full frontend formatting command is intentionally kept as a local visibility check until the remaining legacy-format baseline is cleaned up.

## Production configuration

The intended deployment split is:

- frontend: Cloudflare Pages or another static-host deployment that supports the generated Vite output;
- backend: Render or another Node host;
- database: MongoDB configured through environment variables.

Important frontend variables:

- `VITE_SITE_URL` — exact canonical frontend origin, without a trailing slash;
- `VITE_API_URL` — backend API origin/base.

Important backend variables include:

- `FRONTEND_URL` — allowed frontend origin(s) for CORS;
- `MONGODB_URI` / `MONGODB_DB`;
- `JWT_SECRET`;
- admin bootstrap credentials;
- optional Cloudinary/OpenAI configuration only when those retained modules are enabled.

See `docs/PHASE5_DEPLOYMENT.md` for the SEO/deployment cutover checklist.

## Screenshots

Screenshots are intentionally not committed yet. Add real screenshots only after local and deployed QA so the README does not advertise mocked or stale UI.

Recommended captures after QA:

- Home / Courses
- Course Detail / Lesson
- Student My Courses / Progress
- Quiz result
- Admin Course/Quiz management

## Security and repository history

Do not commit environment files, credentials, private certificates, applicant/CV data, or production exports. Run the repository safety check before every public release.

This repository has legacy history from the previous product, so current-tree cleanup alone is not proof that historical credentials or proprietary assets are safe to publish. Review/rotate historical secrets and verify asset rights before treating the repository history as portfolio-ready. See `SECURITY.md` and `docs/RELEASE_CHECKLIST.md`.

## Roadmap

V1 release work:

- complete local end-to-end QA
- verify production environment variables and CORS
- validate Cloudflare deep links, 404s, robots and sitemap
- review repository history and legacy asset rights
- add real portfolio screenshots

Possible V2 work, intentionally out of the current V1 scope:

- flashcards / spaced repetition
- richer character stroke-order learning
- streaks and lightweight gamification
- AI learning assistance
- pronunciation/speech feedback
- certificates or paid learning features

## License

No license is currently declared. Do not assume redistribution rights for this repository or its historical assets until a license and asset provenance review are completed.
