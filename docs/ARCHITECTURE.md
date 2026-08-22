# Mandora Repository Audit and Target Architecture

## Document status

Audit date: 2026-08-22

This document records the repository state before Mandora application refactoring and
proposes an incremental target architecture. Current-state statements are verified from
the repository. Target-state statements are proposals and are not claims that the code
already exists.

The audit was read-only with respect to application source. It did not connect to the
configured external MongoDB database, enumerate Cloudinary, inspect a live deployment,
or access Search Console. Those systems may contain additional legacy data and assets.

## Frontend implementation update

The original audit below remains the historical baseline. The committed frontend Phase 1
foundation and the subsequent Phase 2 public-learning work have changed the current
frontend as follows:

- public routing now covers Home, Courses, Course Detail, Lesson, HSK, Vocabulary,
  Characters, Practice, Blog list/detail, Login foundation, and a client-side 404;
- reusable public UI lives under `src/components/ui/`, while Courses, learning discovery,
  and Blog presentation are organized by feature;
- no Mandora learning API or persistence exists yet, so Course, Lesson, Vocabulary,
  Character, HSK, and Practice composition data is isolated in explicitly named demo data
  modules and labelled as illustrative in the interface;
- Blog list/detail pages reuse the existing Posts API, but expose only records assigned to
  the approved Mandora Blog category allowlist; legacy corporate Posts are not silently
  published as Mandora content;
- student authentication, enrollment, completion, and progress remain unimplemented, and
  their frontend controls are non-persistent foundations only;
- the backend and its legacy data domains have not been modified by these frontend phases.

This update does not supersede the unresolved product, data, authentication, deployment,
or SEO decisions documented later in this file.

### Admin frontend Phase 3 update

The Mandora Admin frontend now uses URL-addressable destinations under `/admin`, a
responsive grouped sidebar, a compact desktop mode, and a mobile drawer. The active
navigation covers Dashboard; UI foundations for Courses, Units, Lessons, Vocabulary,
Grammar, Characters, Quizzes, Students, Progress, and Settings; and the working Blog,
Media, Blog Categories, and CMS-account modules.

Phase 3 intentionally keeps these boundaries explicit:

- Blog CRUD continues to use the existing Posts API and its current publish, structured
  content, import, and image workflows;
- Media and CMS-account management continue to use their existing APIs and backend
  permission checks;
- Dashboard shows the real Posts total and recent Posts, but does not fabricate learning,
  student, or progress metrics;
- learning, Students, Progress, and Mandora Settings pages are labelled UI foundations
  and make no persistence requests;
- the existing `users` collection remains a legacy `admin`/`employee` CMS-account domain
  and is not displayed as Mandora student data;
- legacy Jobs, Applications, visitor Chat, Communications, Languages, and corporate site
  settings remain in source for preservation/audit purposes but are not exposed by the
  Mandora Admin navigation.

Phase 4 still needs backend contracts and server-enforced authorization for all learning,
student, progress, and Mandora-settings domains. It must also resolve the legacy
`admin`/`employee` role model, unrestricted Posts payloads/public projections, the lack of
an explicit permission on image upload, and the Cloudinary upload/media implementation
that currently accepts and lists only the legacy `spg/` namespace. Frontend menu hiding
in Phase 3 is not a substitute for those backend controls.

## Executive audit

The repository is a small two-package JavaScript application with a functioning corporate
CMS foundation, not an e-learning platform.

- The frontend is a client-rendered React/Vite SPA with public corporate pages and a
  substantial lazy-loaded admin interface.
- The backend is an Express REST API using the native MongoDB driver, JWT/scrypt
  authentication, Cloudinary, Multer, and server-sent events.
- The database model is implicit in controller code. There are no model/repository,
  service, validator, migration, or seed layers.
- Authentication supports legacy `admin` and `employee` roles only. There is no student
  registration or student application.
- The admin manages posts, jobs, applications, corporate settings, media, communications,
  languages, chat, and staff users. It has no learning-content modules.
- No course, unit, lesson, vocabulary, quiz, My Courses, or progress implementation exists
  in either package.
- Public metadata and route content remain tied to the former corporate site. See
  [`SEO_MIGRATION.md`](./SEO_MIGRATION.md).
- There is no committed CI/CD workflow or provider deployment manifest. Existing drafts
  that named frontend/backend providers were not supported by repository configuration.

The recommended path is an incremental domain migration that preserves the useful HTTP,
security, media, content, and admin primitives while retiring the former business domains.

## Repository and Git structure

```text
spg-corporate-website/
├── AGENTS.md
├── README.md                   # still describes the former product
├── docs/
├── samples/                    # legacy Post/Job import examples
├── front-end/
│   ├── package.json
│   ├── package-lock.json
│   ├── index.html
│   ├── public/
│   ├── src/
│   └── _redirects
└── back-end/
    ├── package.json
    ├── package-lock.json
    └── src/
```

There is no root `package.json`, workspace configuration, root `.gitignore`, `.github/`
workflow, Dockerfile, deployment manifest, or license file. The frontend and backend have
their own lockfiles, examples, ignores, and commands.

### Git state captured before documentation work

- Branch: `main`, aligned with the locally cached `origin/main` tracking ref at the time
  of inspection; no network fetch was performed.
- Remote: GitHub over HTTPS, with no credential embedded in the configured URL.
- History topology: 114 commits on `main`, 402 unique commits across all refs, 7 local
  branches, and 26 remote branches excluding the symbolic `origin/HEAD`; no tags,
  submodules, stashes, custom hooks, or extra worktrees were present.
- The origin repository name, branch names, commit messages, and old feature history still
  disclose the former SPG/corporate purpose.
- Pre-existing tracked modification:
  `front-end/src/features/public/components/SocialChatDock.jsx` (two symbol/text changes).
- Pre-existing untracked paths: root and nested `AGENTS` files and `docs/`.
- The pre-existing application modification was preserved and not edited by this task.
- No push, commit, reset, checkout, or history rewrite was performed.

Because documentation was already untracked, Git cannot distinguish the user's draft
content from this task's edits until a commit is made. The final task report must list the
specific documentation files changed.

## Current frontend

### Stack and entry

The installed dependency snapshot is React 19.2.8, React DOM 19.2.8, React Router DOM
7.18.2, Vite 8.2.1, and `@vitejs/plugin-react` 6.0.5. The manifest declares several
packages as `latest`; the lockfile currently pins the installed versions. There is no
declared Node engine and no frontend test script.

The active runtime chain is:

```text
src/main.jsx
└── BrowserRouter
    └── src/app/App.jsx
```

Active client routes are:

| Route             | Current behavior                                                         |
| ----------------- | ------------------------------------------------------------------------ |
| `/admin/*`        | Lazy-loads the corporate admin application.                              |
| `/news/:id`       | Loads a Post detail by MongoDB ObjectId.                                 |
| `/careers/:id`    | Loads a Job detail by MongoDB ObjectId and exposes the application form. |
| `/company/:topic` | Renders a hardcoded corporate topic page.                                |
| `*`               | Renders the corporate Home page, including for unknown URLs.             |

The wildcard behavior creates a soft-404/duplicate-content risk. There is no real public
not-found route.

### Organization

The current feature/service split is useful:

```text
front-end/src/
├── app/
├── features/
│   ├── admin/
│   ├── public/
│   └── shared/
├── services/
├── styles/
└── main.jsx
```

The active admin contains overview, corporate site profile, media, posts, categories,
jobs, communications, chat, languages, applications, and users. It supports pagination,
filters, CRUD, bulk deletion, Post/Job imports, content blocks, galleries, publish state,
and Vietnamese/English/Traditional Chinese content variants.

Maintenance debt includes:

- unused legacy frontend files at `src/App.jsx`, `src/PublicApp.jsx`, `src/Admin.jsx`,
  `src/api.js`, and `src/index.css`; they use different routes and token conventions from
  the active application;
- two global style hotspots: `styles/public.css` (2,917 lines) and `styles/admin.css`
  (2,315 lines), plus several minified one-line CSS files;
- direct `fetch` usage outside the central HTTP client in a small number of modules;
- duplicated language storage constants;
- corporate-specific storage keys, DOM events, CSS classes, and animation names;
- runtime SEO limited to `document.title` changes;
- ObjectId-based public detail URLs instead of stable public slugs.

### Frontend reuse candidates

Strong candidates, after removing old copy and namespaces:

- `services/httpClient.js` URL normalization, error parsing, and request wrapper;
- loading/error/empty/retry components and admin feedback/toast components;
- public and admin pagination;
- safe image, carousel, and lightbox behavior;
- structured text/image/gallery/video rendering with allowlisted YouTube/Vimeo embeds;
- block-content editor and media picker/library patterns;
- debounced query and collection/detail hooks;
- theme primitives;
- admin layout, search, and navigation patterns.

Posts are an adaptable foundation for Blog, but the unrestricted payload behavior and
legacy records must not be carried forward. Public corporate page components are too
domain-specific to relabel wholesale.

## Current backend

### Stack and process

The installed dependency snapshot is Node ESM with Express 4.22.2, MongoDB driver 7.5.0,
Cloudinary 2.10.0, JSON Web Token 9.0.3, Multer 1.4.5-lts.2, Helmet 8.3.0,
`express-rate-limit` 8.6.2, CORS, dotenv, and Nodemon. Most manifest ranges are `latest`,
while the lockfile pins the snapshot.

`server.js` loads environment variables, validates required configuration, and starts the
Express application. MongoDB connects lazily on the first database operation; startup and
`GET /health` do not prove database or Cloudinary readiness. A database close helper
exists, but graceful shutdown is not wired.

The current backend structure is:

```text
back-end/src/
├── config/
├── controllers/
├── middleware/
├── routes/
├── utils/
├── app.js
└── server.js
```

There are no service, model/repository, validator, migration, or dedicated integration-test
directories. Controllers perform HTTP translation, business decisions, and database
access together.

### HTTP surface

Public `/api` routes expose Posts, Jobs, Categories, Languages, Communications, Site
Profile, visitor Chat, server-sent events, and recruitment Applications/CV upload.

Authenticated `/api/admin` routes expose login/session, staff Users and permissions,
Categories, Languages, Chat, Communications, Site Profile, Media, image upload, generic
Post/Job CRUD and import, Applications/CV download, and logo settings.

There are no Mandora learning or student APIs.

### Existing strengths

- exact-origin CORS with comma-separated configured origins;
- Helmet, JSON body limits, general and endpoint-specific rate limits;
- async error forwarding and generic client-safe server errors;
- salted `scrypt` password hashing with timing-safe comparison;
- JWT verification followed by a current database-user check;
- backend permission middleware on the legacy admin domains;
- image, CV, and import size/type/signature checks;
- strict Cloudinary host/redirect checks for private CV downloads;
- a reusable native MongoDB connection cache;
- Node's built-in test runner.

### Existing risks and gaps

- generic Post/Job create and update spread arbitrary request bodies into MongoDB;
- public Post/Job responses have no explicit field projection, so accidentally stored
  internal fields could become public;
- a missing `published` field is treated as published;
- initialization/default seeding occurs during Category and Language read requests;
- indexes are incomplete for current query patterns and nonexistent for future learning
  and progress queries;
- no transactions or referential-integrity boundary exists;
- request validation is inconsistent and there is no centralized validator layer;
- in-memory rate-limit/SSE state is process-local;
- there is no request logging, admin audit trail, or observability configuration;
- API routes are not versioned;
- the authenticated image-upload route has no explicit feature permission beyond being
  behind general authentication;
- legacy applicant/chat PII has no retention or deletion workflow;
- a database failure after CV upload can leave an orphaned private asset;
- imported PDF attachments are not included in all content-deletion cleanup paths;
- the corporate OpenAI chat sends recent messages to an external API and has no documented
  consent/retention policy.

## Current database

MongoDB is accessed directly. The audit inferred collections and known fields from code;
it did not inspect actual stored records.

| Collection      | Verified current purpose                                                                                         | Initialization/index behavior                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `users`         | Legacy staff username, display name, scrypt hash, `admin`/`employee` role, permissions, active flag, timestamps. | Unique username index.                                                             |
| `posts`         | Corporate/news content, structured blocks, translations, media, publish state.                                   | No code-defined indexes; payload shape is unrestricted.                            |
| `jobs`          | Recruitment content, structured blocks, translations, media, publish state.                                      | No code-defined indexes; payload shape is unrestricted.                            |
| `applications`  | Applicant contact/position/message data and private CV metadata.                                                 | No code-defined indexes.                                                           |
| `categories`    | Auto-created corporate Post categories.                                                                          | Unique slug index; defaults may be inserted on a read request.                     |
| `languages`     | Auto-created `vi`, `en`, and `zh-tw` interface/content language records.                                         | Unique code and enabled/order indexes; defaults may be inserted on a read request. |
| `settings`      | Mixed keyed documents for logo, banner, corporate site profile, and chat settings.                               | No code-defined indexes beyond `_id`.                                              |
| `notifications` | Public corporate announcements.                                                                                  | No code-defined indexes.                                                           |
| `chat_sessions` | Visitor contact/token/status/unread state.                                                                       | No code-defined indexes.                                                           |
| `chat_messages` | Visitor/admin/bot messages and metadata.                                                                         | No code-defined indexes.                                                           |

No courses, units, lessons, vocabulary, quizzes, student-course associations, or progress
records are defined in the repository.

## Current authentication and admin

Login accepts username/password. If the configured bootstrap administrator does not yet
exist, a matching environment username/password creates it in MongoDB. Passwords are
stored as salted scrypt hashes. A successful login returns an eight-hour JWT with the
user ID in `sub`; every authenticated request verifies the token and reloads the active
user from MongoDB.

The active frontend stores the bearer token in localStorage under an SPG-prefixed key.
There is no refresh token, server-side logout/revocation mechanism, public registration,
student login contract, password recovery, email verification, or student record-ownership
layer. The token transport/storage decision must be reviewed rather than copied blindly
into the student application.

Legacy backend permissions are detailed and server-enforced for most admin routes, and
self-demotion/disable/delete protections exist. They cover corporate modules and do not
model Mandora admin/student ownership.

## Media, realtime, import, and AI

- Cloudinary uploads, authenticated CV delivery, deletion, and media listing are present.
- All current upload folder allowlists and media enumeration use the legacy `spg/`
  namespace.
- A dependency-free CSV/XLSX parser and import preview/commit flow exist, but mappings are
  specific to Posts and Jobs.
- General and Chat-specific server-sent-event registries are in memory.
- The visitor Chat can use hardcoded corporate replies or an OpenAI Responses request.
  This is not an AI Tutor and is explicitly outside Mandora V1.

Cloudinary/image utilities may be reused only after a Mandora namespace and asset
ownership policy are established. Recruitment/CV, visitor Chat/OpenAI, Job import, and
corporate realtime behavior should be quarantined or retired, not exposed as Mandora
features.

## Deployment and environment audit

Verified deployment-related artifacts are limited to:

- frontend `dev`, `build`, and `preview` scripts;
- backend `start` and `dev` scripts plus `PORT`;
- `FRONTEND_URL`-based CORS;
- production proxy trust;
- a lightweight `/health` route;
- a hardcoded old `pages.dev` hostname in HTML, robots, and sitemap;
- `front-end/_redirects` containing a single SPA rewrite rule.

No committed configuration proves a current Cloudflare Pages, Render, Netlify, Vercel,
container, or other deployment. The old `pages.dev` hostname identifies legacy public
metadata, not a verified deployment contract. There is no committed backend production
URL.

With the default Vite config, `front-end/_redirects` is not copied into `dist/`; the
verified build output omitted it. Deep-link behavior therefore depends on undocumented
external host settings and may fail.

The frontend has `VITE_API_URL`, `VITE_LOGO_URL`, and a Google Maps key example. The
backend example covers core database/auth/OpenAI/Cloudinary variables. There is no
`SITE_URL` configuration, and the backend still falls back to an `spg` database name.

## Secrets, proprietary material, and publication risk

### Current working tree

- Ignored `back-end/.env` contains configured MongoDB, Cloudinary, bootstrap-admin, and
  legacy token values plus a remote logo reference. Values were not printed or copied.
- Ignored `front-end/.env.local` contains local API configuration, Cloudinary public-side
  identifiers, and a remote legacy logo URL. `VITE_*` values would be browser-visible if
  used in a build.
- Both local files are covered by their package-level `.gitignore` and are not tracked.
- A root `.env` would not currently be covered because no root `.gitignore` exists.
- Current tracked/example-file scanning found no high-confidence live secret in the
  current tree.

### Git history

- A reachable early version of `back-end/.env.example` contained a fixed legacy
  `ADMIN_TOKEN`. Its value is intentionally omitted and must be treated as compromised;
  verify that every environment that could have accepted it has rotated/revoked it.
- A later reachable example also contained a known weak eight-character admin default.
  It must not be accepted in any current environment.
- Historical credential-shaped MongoDB URIs inspected by the audit used literal
  username/password placeholders rather than confirmed database credentials.
- Historical Cloudinary key/secret entries inspected were placeholders; public cloud-name
  and upload-preset identifiers are not private keys but still identify legacy
  infrastructure.
- The actual ignored `.env` filename was not found as a tracked path.
- Do not rewrite history automatically. Rotation/revocation and a publication decision
  come first.

### Unreachable local Git objects

The local `.git` object database is a separate high-risk finding:

- 10,641 unreachable loose blobs and two dangling stash-style commits are present;
- three unreachable environment blobs contain the same current Cloudinary API key and
  secret found in the ignored backend environment;
- two of those blobs also contain the same current credentialed MongoDB URI;
- unreachable frontend environment variants contain legacy Cloudinary identifiers/logo
  URLs and old provider hostnames;
- these objects are not reachable from any ref or reflog, so the audit found no evidence
  that they were pushed, but their values are recoverable from this local `.git` folder.

Rotate the affected MongoDB and Cloudinary credentials before sharing or archiving the
repository with `.git`. After rotation and an approved backup, perform a deliberate local
object-cleanup/prune procedure. Do not prune or rewrite automatically as part of ordinary
refactoring.

### Assets and private data

- The only committed or reachable-history visual asset found is
  `front-end/public/favicon.svg`, a 58,751-byte traced vector with no provenance/license
  record. It is wired as the legacy favicon and should be replaced or quarantined pending
  ownership review.
- The configured remote logo and all Cloudinary objects under `spg/` are outside Git and
  were not enumerated.
- MongoDB may contain old Posts, Jobs, applicant data, CV metadata, chat contacts/messages,
  partner logos, locations, banners, and other corporate data.
- There is no repository license file. Do not assume code or assets are approved for a
  public repository merely because they are present locally.
- Git history retains old corporate code and copy even after future deletion from the
  current tree. Keep the repository private until publication rights and the secret-history
  response are resolved.

## Baseline validation

No application fixes were made because this task is documentation-only.

| Check                 | Result             | Verified detail                                                                                                                                                                    |
| --------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend build        | Pass               | Vite transformed 127 modules and emitted production assets. `_redirects` was absent.                                                                                               |
| Frontend lint         | Fail               | 1 error and 17 warnings. The error is an empty block in `PublicCommunications.jsx`; warnings are mainly hook dependencies plus three unused disables and one Fast Refresh warning. |
| Frontend format check | Fail               | Prettier reported 76 files with style differences.                                                                                                                                 |
| Frontend tests        | Not available      | No frontend test script or project test files exist.                                                                                                                               |
| Backend tests         | Fail               | 18 total: 15 passed, 3 failed because tests still expect the old token message/payload and bypass the new database-backed user check.                                              |
| Backend lint/build    | Not available      | No backend lint or build script exists.                                                                                                                                            |
| Dependency audit      | Pass at audit time | `npm audit --omit=dev` reported 0 vulnerabilities in each package.                                                                                                                 |

The three backend failures do not show a proven production authentication bypass; they
show that the auth implementation changed while the tests retained the previous contract.
They must be repaired before auth is used as the Mandora foundation.

## Reuse, adapt, retire

| Disposition                   | Existing areas                                                                                                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse with normal cleanup     | Express app/security middleware, Mongo connection, async/error helpers, ObjectId helper, scrypt/JWT primitives, upload signature checks, frontend HTTP client, feedback/loading states, pagination, safe media/rendering primitives, admin shell patterns. |
| Adapt behind explicit schemas | Posts -> Blog, structured content blocks, media library, content editor, publish/filter/pagination patterns, staff user UI, language/localization patterns if V1 locale requirements confirm them.                                                         |
| Quarantine/retire for V1      | Jobs, applications/CVs, corporate site profile/partners/location, corporate categories, visitor/social chat, OpenAI corporate assistant, event communications, Job/Post legacy imports, factory/recruitment pages and styles.                              |
| Remove after import audit     | Dead frontend entry/auth/API files and obsolete SPG-prefixed technical namespaces.                                                                                                                                                                         |

## Target architecture principles

1. Preserve the two-package boundary and existing runtime stacks.
2. Organize new work by product domain, not by public/admin duplication.
3. Keep shared infrastructure small and earned by actual reuse.
4. Put validation and business rules before database writes.
5. Give public reads explicit projections and published-state rules.
6. Enforce admin role and student ownership on the API.
7. Add collections/indexes through a repeatable initialization/migration path.
8. Keep SEO metadata and URLs part of the public-page architecture, not an afterthought.
9. Move incrementally; do not create every proposed directory before its first real file.

## Proposed target folder structure

```text
front-end/
├── public/
└── src/
    ├── app/
    │   ├── App.jsx
    │   └── routes.jsx
    ├── assets/                  # owned Mandora assets only
    ├── components/
    │   ├── ui/
    │   └── content/
    ├── features/
    │   ├── auth/
    │   ├── blog/
    │   ├── courses/
    │   ├── lessons/
    │   ├── vocabulary/
    │   ├── quizzes/
    │   ├── progress/
    │   └── admin/
    ├── layouts/
    │   ├── PublicLayout.jsx
    │   ├── StudentLayout.jsx
    │   └── AdminLayout.jsx
    ├── services/
    │   └── httpClient.js
    ├── hooks/
    ├── utils/
    ├── constants/
    ├── styles/
    └── main.jsx

back-end/
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   ├── env.js
    │   └── db.js
    ├── middleware/
    │   ├── auth.js
    │   ├── errors.js
    │   └── upload.js
    ├── features/
    │   ├── auth/
    │   ├── users/
    │   ├── courses/
    │   ├── units/
    │   ├── lessons/
    │   ├── vocabulary/
    │   ├── quizzes/
    │   ├── blog/
    │   ├── progress/
    │   └── media/
    └── utils/
```

The tree is a destination, not a scaffold command. A backend feature should add only the
route, controller, service, repository/model, validator, and tests it needs. With the
native driver, the repository/model boundary should own collection names, indexes,
queries, field allowlists, and public projections; no ORM is implied.

Frontend domain features should serve public, student, and admin consumers without three
copies of the same data logic. Shared layouts and UI should not absorb domain business
rules.

## Proposed domain and data boundaries

The following are target concepts, not finalized collection names or schemas:

| Domain                     | Minimum responsibility                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Users/Auth                 | `admin` and `student` identities, credentials/session contract, account state, backend authorization.            |
| Courses                    | Course catalog records, publish/order state, and stable public identity.                                         |
| Units                      | Ordered children of one Course.                                                                                  |
| Lessons                    | Ordered children of one Unit and the lesson content needed by the approved experience.                           |
| Vocabulary                 | Vocabulary content related to the hierarchy according to the pending product decision.                           |
| Quizzes                    | Quiz definitions and grading rules related to the hierarchy; persistence is limited to agreed V1 progress needs. |
| Student course association | The rule/data that makes a Course appear in My Courses; exact enrollment/assignment behavior is unresolved.      |
| Progress                   | Student-owned completion state derived from explicit, agreed rules.                                              |
| Blog                       | Published editorial content adapted from validated Post/content-block patterns.                                  |
| Media                      | Owned asset metadata and server-side upload/deletion rules using a Mandora namespace.                            |

Course, Unit, and Lesson references, deletion behavior, slug uniqueness, ordering, publish
cascades, progress uniqueness, and required indexes must be designed together before
production writes begin.

## Target request boundaries

- Public APIs return published learning/Blog data through explicit projections.
- Student APIs share the authentication foundation but authorize access to the current
  student's own course/progress records.
- Admin APIs require the `admin` role and validate all mutations.
- Controllers translate HTTP; services enforce business rules; repositories/models own
  MongoDB operations; validators own input shape.
- The current generic `type`-based Post/Job controller should not become a generic
  all-domain CRUD layer.
- Media changes must be coordinated with database references so failed writes and deletes
  do not orphan assets.

Exact endpoint paths and token transport are intentionally not invented here. They should
be written as API contracts during Phase 1 after the open product decisions are resolved.

## Target deployment and configuration contract

No provider is selected by the repository. Phase 1 should define provider-neutral inputs:

- `SITE_URL`: verified public Mandora origin used for canonical URLs, structured data,
  sitemap, and robots;
- `VITE_API_URL`: browser API base;
- `FRONTEND_URL`: exact backend CORS allowlist;
- explicit Mandora MongoDB URI/database name with no `spg` fallback;
- a current JWT/session secret and bootstrap policy;
- optional Cloudinary configuration with a Mandora namespace;
- environment-specific logging/readiness behavior.

Provider manifests should be added only after the deployment target is actually chosen.
Secrets remain in provider/environment storage, never in Git.

Indexable public pages must deliver route-specific title, description, canonical, social,
and valid structured metadata in rendered HTML. Whether that is achieved through
prerendering, server rendering, or another verified build approach is a Phase 1 technical
decision; the current client-only title hook is insufficient.

## Proposed Phase 1: safe Mandora foundation

Phase 1 should produce a secure, index-safe foundation and one real learning vertical
slice without importing legacy business content.

1. **Protect the migration**
   - keep the repository private;
   - rotate the MongoDB and Cloudinary credentials recoverable from unreachable local Git
     objects, and verify revocation of historical admin credentials;
   - review/revoke the legacy Cloudinary upload preset and migrate from `ADMIN_TOKEN` to a
     current `JWT_SECRET`;
   - after rotation and an approved backup, clean the unreachable local Git objects without
     rewriting shared history;
   - inventory/back up authorized MongoDB and Cloudinary data without publishing it;
   - decide retention, export, and deletion for applications, CVs, chat, users, and media.

2. **Make URL and product decisions**
   - confirm the production hostname and `SITE_URL` contract;
   - export the old indexed URL inventory and approve a redirect/410 map;
   - decide My Courses association, Progress completion, Vocabulary ownership, Quiz scope,
     publish cascades, and locale strategy.

3. **Stabilize the baseline**
   - repair the stale backend auth tests;
   - clear the frontend lint error and establish an agreed formatting baseline;
   - add missing test seams around auth, validation, and public projections;
   - declare the supported Node version and stop relying on floating `latest` ranges for
     reproducibility.

4. **Perform the branding/SEO cutover**
   - replace old public copy, favicon, email, metadata, JSON-LD, robots, sitemap, runtime
     titles, and technical namespaces;
   - implement a real not-found response and working deep-link fallback;
   - ensure private/auth/admin pages are not indexed;
   - follow the staged checklist in `SEO_MIGRATION.md`.

5. **Establish Mandora domains incrementally**
   - introduce the validated `admin`/`student` authentication boundary;
   - define repeatable MongoDB collection/index initialization;
   - implement the first Course -> Unit -> Lesson contracts and public/admin vertical
     slice with empty states and no fake production data;
   - adapt Blog/media primitives only after public projections and ownership rules exist.

Phase 1 is complete when the selected checks pass, the public bundle/rendered pages contain
no obsolete corporate identity, redirects/status/canonical behavior are verified, secrets
and proprietary assets are cleared for the chosen visibility, and the first learning slice
uses server-validated Mandora data.
