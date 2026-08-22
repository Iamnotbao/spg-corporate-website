# Mandora Repository Instructions

## Mission

This repository is being permanently repurposed from the former SPG / Chí Hùng
corporate website into:

**Mandora — a Chinese e-learning platform for Vietnamese learners.**

The former corporate, footwear-manufacturing, recruitment, and visitor-chat product is
deprecated. Do not add new functionality or public copy for that product.

## Sources of truth

- `docs/PRODUCT.md` defines Mandora's approved product scope.
- `docs/ARCHITECTURE.md` records the verified repository audit and target architecture.
- `docs/SEO_MIGRATION.md` governs the indexed-site migration and public URL cutover.
- This file governs how changes are made in the repository.

If implementation and documentation disagree, verify the code and update the relevant
documentation in the same change. Do not invent an implementation detail to make the
documentation look complete.

## Verified repository baseline

- `front-end/` is a JavaScript React/Vite single-page application using React Router.
- `back-end/` is a JavaScript Node/Express API using the native MongoDB driver.
- The packages are independent; there is no root workspace or root package script.
- The active frontend entry is `front-end/src/main.jsx` ->
  `front-end/src/app/App.jsx`.
- The backend entry is `back-end/src/server.js`; `back-end/src/app.js` builds the
  Express application.
- Existing authentication is for legacy `admin` and `employee` accounts. Mandora V1
  requires `admin` and `student` roles.
- Existing MongoDB collections and APIs serve posts, jobs, applications, corporate
  settings, languages, notifications, chat, and staff accounts. Mandora learning
  collections and APIs do not exist yet.
- Cloudinary, upload validation, JWT/scrypt helpers, loading/error UI, structured
  content, media tools, and parts of the admin shell are potential reuse candidates.
- No deployment provider configuration, CI workflow, database migration framework, or
  committed production domain is present.

Treat `docs/ARCHITECTURE.md` as the detailed baseline. Re-audit before relying on it
after substantial implementation changes.

## Working principles

- Inspect `git status` and relevant code before changing anything.
- Preserve existing uncommitted work. Do not discard, overwrite, or reformat unrelated
  changes.
- Refactor incrementally. Reuse working infrastructure where it fits Mandora; do not
  rewrite the whole repository without a documented reason.
- Prefer a small, maintainable architecture over speculative abstraction.
- Keep business rules explicit and testable.
- Do not create fake production data, invented metrics, partner names, testimonials,
  deployment details, or screenshots.
- Do not add a dependency until the existing stack cannot reasonably meet the need.
- Do not implement future-scope features unless the user explicitly requests them.

## Mandora V1 scope

### Public

- Home
- Courses
- Course Detail
- Lesson
- Vocabulary
- Quiz
- Blog

### Student

- Login/Register
- My Courses
- Progress

### Admin

- Dashboard
- Courses
- Units
- Lessons
- Vocabulary
- Quizzes
- Blog
- Students

### Out of scope for V1

- AI Tutor or repurposing the legacy OpenAI visitor chat as a tutor
- payments or subscriptions
- live classes
- certificates
- pronunciation or speech scoring
- advanced gamification
- advanced spaced repetition

## Architecture transition

- Preserve the current `front-end/` and `back-end/` boundary unless a later verified
  requirement justifies changing it.
- Move toward feature-based modules as features are implemented; do not create empty
  folders merely to match the proposed tree.
- Remove or quarantine legacy modules only after confirming their imports, routes,
  stored data, remote assets, and redirect requirements.
- Do not silently reinterpret legacy employees as students or legacy corporate content
  as learning content.
- Do not copy legacy chat, jobs, applications, CV, partner, location, or factory logic
  into a Mandora module.
- `posts` may inform the Blog implementation structurally, but old post records and copy
  are not Mandora content.

## Frontend rules

- Use PascalCase for React components and camelCase for functions and variables.
- Keep routing and application providers under `src/app/`.
- Organize product code by feature, with shared UI promoted only after real reuse.
- Keep API calls in `src/services/` or feature services, not presentational components.
- Centralize API and site URL configuration. Do not hardcode production origins.
- Provide loading, empty, error, and retry states for remote data.
- Keep public, student, and admin layouts responsive and accessible.
- Give unknown public routes a real not-found experience; do not render Home for every
  unmatched path.
- Avoid giant components, duplicated forms, arbitrary inline styles, and another global
  CSS monolith.
- When changing local-storage keys, provide a deliberate migration or cleanup path; do
  not strand legacy SPG-prefixed state accidentally.

## Backend rules

- Preserve Node, Express, and the native MongoDB driver unless a documented requirement
  justifies a stack change.
- Keep routes thin. Put request translation in controllers and business logic in
  services.
- Give each feature explicit validation and field allowlists. Do not spread arbitrary
  request bodies into MongoDB documents.
- Isolate collection names, indexes, queries, and public projections in a model or
  repository boundary compatible with the native driver.
- Enforce authentication, roles, record ownership, and permissions on the backend.
- Mandora V1 roles are exactly `admin` and `student` unless the product specification is
  explicitly changed.
- Never return password hashes, tokens, private media metadata, or other internal fields.
- Keep error responses safe; log operational failures without leaking secrets or PII.
- Define indexes and a repeatable migration/init path before creating Mandora production
  data.
- Do not seed production from read requests.
- Add graceful shutdown and meaningful readiness checks when deployment work begins.

## Data and privacy

- Design the Course -> Unit -> Lesson hierarchy before adding collections.
- Define how Vocabulary and Quiz content attach to that hierarchy before implementation.
- Define what qualifies a course for My Courses and how Progress is calculated; these
  rules are not yet specified.
- Treat legacy applications, CVs, chat contacts/messages, MongoDB records, and Cloudinary
  media as potentially sensitive or proprietary.
- Do not connect to, migrate, delete, or publish legacy external data without explicit
  authorization, a backup, and a written retention/mapping decision.
- New Mandora media must not use the legacy `spg/` namespace.

## SEO and public migration

The former site has been indexed. Public branding work must follow
`docs/SEO_MIGRATION.md`.

- Do not invent a production domain.
- Use a verified environment/config value such as `SITE_URL` for canonical URLs,
  sitemap URLs, and structured data.
- Replace obsolete title, description, favicon, Open Graph data, structured data, and
  runtime titles together.
- Generate route-specific metadata in rendered HTML for indexable public pages.
- Keep admin, authentication, and student-private pages out of the index.
- Include only canonical, public, successful URLs in the sitemap.
- Build an explicit old-URL map. Use a permanent redirect only when a genuine equivalent
  exists; return an appropriate gone/not-found response for obsolete unrelated content.
- Do not redirect every legacy URL to Home.
- Do not block legacy URLs in `robots.txt` before crawlers can observe their redirect or
  removal status.
- Test canonical behavior, status codes, sitemap output, robots rules, deep links, and
  soft-404 behavior before cutover.

## Legacy branding and assets

Public application code must ultimately contain no obsolete references to:

- SPG
- Chí Hùng / Chi Hung
- the old corporate email or hostname
- shoe or footwear manufacturing
- factory production copy
- recruitment, jobs, applications, or CV submission
- corporate partners, company location, union, or visitor-support copy

Migration/audit documentation may name the former brand where necessary. Do not blindly
replace the generic programming word `factory` when it is unrelated to the old business.

Before public release, inventory and verify ownership of the legacy favicon, configured
Cloudinary logo, all assets under the legacy media prefix, database-driven images, and
Git history. Removing a file from the current tree does not remove it from history.

## Security and environment

- Never expose or commit API keys, JWT secrets, database credentials, admin credentials,
  private certificates, `.env`, or `.env.local`.
- Keep `.env.example` files limited to safe placeholders and keep them aligned with
  variables actually read by the application.
- Remember that `VITE_*` values are exposed to browser bundles.
- Keep the repository private until historical credentials and asset publication rights
  have been reviewed.
- If a secret is discovered in history, report it and rotate/revoke it. Do not rewrite
  Git history automatically.
- Do not copy values from the ignored legacy environment files into documentation,
  examples, tests, commands, or output.

## Git

- Use `git status` before and after meaningful work.
- Do not push unless explicitly requested.
- Never force-push, run `git reset --hard`, or rewrite history unless explicitly
  authorized for that exact action.
- Prefer small conventional commits when commits are requested: `feat:`, `fix:`,
  `refactor:`, `chore:`, `docs:`.
- Do not commit generated `dist/`, dependency folders, local logs, uploads, or environment
  files.
- A root `.gitignore` does not currently exist; do not assume root-level secret files are
  protected by the nested ignores.

## Validation

Run checks relevant to the files changed. Existing commands are:

```powershell
cd back-end
npm test

cd ..\front-end
npm run lint
npm run format:check
npm run build
```

The repository audit recorded pre-existing test, lint, and formatting failures in
`docs/ARCHITECTURE.md`. Do not conceal them or attribute them to an unrelated change.
When changing application code, improve or preserve the baseline and report exact results.

## Before completing a task

Check that:

1. requested scope is complete and no unrelated user changes were overwritten;
2. relevant imports, routes, and builds are valid;
3. backend authorization and validation are enforced for changed endpoints;
4. loading, empty, error, and responsive states exist where relevant;
5. no obsolete brand copy remains in touched public application areas;
6. SEO changes follow the migration plan;
7. no secret, private data, or unlicensed proprietary asset was added;
8. documentation reflects the actual implementation;
9. validation and remaining known failures are summarized accurately.
