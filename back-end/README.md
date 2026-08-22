# Mandora Backend

Express REST API for the Mandora Chinese-learning platform. The backend uses the native MongoDB driver, JWT authentication, server-side authorization, learning-domain services/repositories, and retained CMS/media modules where they are still required.

## Local development

```bash
npm ci
cp .env.example .env
npm run dev
```

PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

The API defaults to `http://localhost:10000`.

## Scripts

```bash
npm run dev
npm start
npm test
```

## Main source areas

```text
src/
├── config/                  Environment and MongoDB configuration
├── controllers/             Retained CMS/account controllers
├── features/
│   ├── learning/            Course, Unit and Lesson domain
│   ├── progress/            Student/admin progress reporting
│   ├── quiz/                Quiz, Question and QuizAttempt domain
│   ├── student-auth/        Student registration/login boundary
│   ├── student-learning/    Enrollment and LessonProgress
│   └── vocabulary/          Vocabulary and saved Vocabulary state
├── middleware/              Authentication, upload and request guards
├── routes/                  Public, student and admin routes
├── utils/                   Shared helpers
├── app.js                   Express application
└── server.js                Process entry point
```

## Authentication and ownership

Mandora V1 learning roles are `admin` and `student`. Authorization is enforced by backend middleware/services; frontend route hiding is not treated as a security boundary.

Student-owned APIs derive the owner from the authenticated account. They do not accept arbitrary `userId` values for Enrollment, LessonProgress, QuizAttempt or saved Vocabulary operations.

## Environment

See `.env.example`. Production environments should provide at least:

- `MONGODB_URI`
- `MONGODB_DB`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `FRONTEND_URL`

Cloudinary and OpenAI variables are optional unless retained modules that depend on them are enabled.

Do not commit `.env` or any production credential.

## Validation

```bash
npm test
```

The tests cover the learning services, authentication/authorization boundaries, enrollment/progress behavior, Quiz scoring/history, and API authentication smoke checks.

## Deployment notes

`FRONTEND_URL` controls allowed CORS origins. When changing the Cloudflare/custom frontend hostname, update this value accordingly. The application currently supports a comma-separated transition list of allowed frontend origins.

MongoDB collection indexes are initialized lazily and idempotently by the feature repositories. The project does not currently have a general migration framework, so production schema/index changes must remain backward-compatible and non-destructive.

See `../docs/ARCHITECTURE.md` and `../docs/LEARNING_LIFECYCLE.md` for the current V1 contracts.
