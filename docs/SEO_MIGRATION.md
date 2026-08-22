# Former Corporate Site to Mandora SEO Migration

## Purpose

The former SPG / Chí Hùng website has already been indexed. Repurposing its repository
without a URL and metadata migration can preserve the old brand in search, create soft
404s, expose private routes, and discard whatever legitimate signals the old URLs have.

This document records the verified repository state and defines the safe migration process.
It does not select or invent a production domain. No live deployment or Search Console
property was accessed during the audit.

## Current indexed surface audit

### Static document metadata

`front-end/index.html` currently contains:

- `<html lang="vi">`;
- an old Chí Hùng/SPG footwear-manufacturer title;
- an old corporate/footwear/recruitment meta description;
- old-brand and recruitment meta keywords;
- a Google site-verification token for the old site identity;
- `robots=index, follow`;
- the old theme color and `favicon.svg`;
- only `og:site_name`, with the old brand;
- `WebSite` JSON-LD with old names and the hardcoded
  `https://spg-corporate-website.pages.dev/` URL.

It does **not** contain:

- a canonical link;
- route-aware description or canonical handling;
- complete Open Graph title/description/URL/image/type fields;
- Twitter card fields;
- hreflang links;
- route-aware structured data;
- a social preview asset with verified Mandora ownership.

The Google verification token is public-by-design metadata, not an API secret. Keep or
remove it only after confirming ownership and the Search Console property plan.

### Runtime metadata

The only runtime SEO helper is `useDocumentTitle()` in
`front-end/src/features/public/hooks/usePublicContent.js`. Home, News, Career, and Company
Topic pages set old-brand titles after JavaScript runs. They do not update descriptions,
canonical URLs, robots directives, social metadata, or JSON-LD.

The application is a client-rendered Vite SPA with no committed prerender or server-render
configuration. Public content arrives from the API after initial HTML. The Phase 1
implementation must ensure indexable routes expose their route-specific content and
metadata in rendered HTML; a client-only title change is not enough as the architectural
SEO contract.

### Robots and sitemap

`front-end/public/robots.txt` currently:

- allows every path;
- does not distinguish admin, auth, or private student routes;
- points to the old Pages hostname's sitemap.

`front-end/public/sitemap.xml` currently:

- contains only the old Pages root URL;
- omits every current News, Career, and Company Topic route;
- cannot represent Mandora because there is no configured site origin or sitemap
  generation from published data.

`front-end/public/robots.txt` and `sitemap.xml` are copied into the Vite build. They still
contain the old hostname in the verified build output.

### Canonical and 404 behavior

No canonical configuration exists anywhere in the frontend.

The active router sends every unmatched path to Home. The only checked-in rewrite rule is:

```text
/* /index.html 200
```

It lives at `front-end/_redirects`, outside Vite's default `public/` copy path. The verified
build did not emit `_redirects`. Therefore:

- external host configuration, if any, is undocumented;
- direct deep links may fail on a clean deployment;
- when routing does work, unknown URLs render Home and behave like soft 404s;
- the SPA cannot currently express accurate HTTP status behavior for removed/unknown
  public content.

### Deployment URLs

The only production-like frontend origin in tracked application/config files is:

```text
https://spg-corporate-website.pages.dev/
```

It appears in `index.html` JSON-LD, `robots.txt`, and `sitemap.xml`. The hostname is a
Cloudflare Pages hostname, but the repository has no provider manifest proving the current
deployment setup. An old Render backend hostname exists only in unreachable local Git
objects, not in tracked configuration, and must not be treated as a supported/current
deployment.

There is no committed production API origin, `SITE_URL`, canonical-origin helper,
deployment workflow, container configuration, or provider environment manifest.

## Known old URL inventory

The source defines these public legacy patterns:

| Legacy URL/pattern                                                            | Current behavior                                           | Migration default                                                                                                                    |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                                                           | Corporate Home and all hardcoded corporate sections.       | Replace with Mandora Home only at the coordinated cutover.                                                                           |
| `/news/:id`                                                                   | Corporate Post detail by MongoDB ObjectId.                 | Redirect only if an editor approves a genuine Mandora Blog equivalent; otherwise retire with an appropriate gone/not-found response. |
| `/careers/:id`                                                                | Job detail and application/CV flow.                        | No Mandora V1 equivalent; do not redirect blindly to Home or Courses.                                                                |
| `/company/:topic`                                                             | Hardcoded corporate topics such as manufacturing/location. | No Mandora V1 equivalent; retire explicitly.                                                                                         |
| `/#about`, `/#manufacturing`, `/#process`, `/#news`, `/#careers`, `/#contact` | Corporate Home fragments used by navigation.               | Replace navigation; fragments do not justify unrelated redirects.                                                                    |
| Any unknown path                                                              | Home through the wildcard route.                           | Replace with a real not-found outcome.                                                                                               |

This is not a complete list of indexed URLs. MongoDB may contain discoverable Post/Job
ObjectIds, links may exist outside the sitemap, and external backlinks/Search Console may
show URLs that are absent from source. Export the real URL inventory before cutover.

## Legacy branding, content, and asset inventory

The following inventory is intentionally explicit so cleanup is not limited to a search
and replace in `index.html`.

### Indexed/static identity

- `front-end/index.html`
- `front-end/public/robots.txt`
- `front-end/public/sitemap.xml`
- `front-end/public/favicon.svg`
- generated/ignored `front-end/dist/` copies of the same identity

The favicon is the only committed or reachable-history visual asset found. It is a large
traced SVG with no provenance or license record. Treat it as a legacy/proprietary asset
until ownership is confirmed; replace it rather than recolor it by assumption.

### Active public frontend

Old name, email, footwear, factory, recruitment, corporate-navigation, or technical SPG
namespace references are present across:

- `src/features/public/pages/HomePage.jsx`
- `src/features/public/pages/TopicPage.jsx`
- `src/features/public/pages/NewsDetailPage.jsx`
- all of `src/features/public/pages/CareerDetailPage.jsx`
- `src/features/public/components/ApplicationForm.jsx`
- `src/features/public/components/Brand.jsx`
- `src/features/public/components/ContentCards.jsx`
- `src/features/public/components/LanguageSwitcher.jsx`
- `src/features/public/components/PublicCommunications.jsx`
- `src/features/public/components/PublicSearchOverlay.jsx`
- `src/features/public/components/RelatedContent.jsx`
- `src/features/public/components/SafeImage.jsx`
- `src/features/public/components/SiteFooter.jsx`
- `src/features/public/components/SiteHeader.jsx`
- `src/features/public/components/SocialChatDock.jsx`
- `src/features/public/i18n.js`
- `src/features/shared/GoogleMapEmbed.jsx`
- `src/features/shared/ThemeToggle.jsx`
- `src/features/shared/useThemeMode.js`

`SiteFooter.jsx` hardcodes the old corporate email. Home/i18n/Topic pages describe shoe
manufacturing, company history, partners, location, union, recruitment, and production.
These are obsolete product semantics, not reusable Mandora copy.

### Active admin frontend

Legacy branding or corporate workflows appear in:

- `src/features/admin/AdminApp.jsx`
- `src/features/admin/constants.js`
- `src/features/admin/components/AdminLogin.jsx`
- `src/features/admin/components/AdminLayout.jsx`
- `src/features/admin/components/OverviewPanel.jsx`
- `src/features/admin/components/ApplicationsPanel.jsx`
- `src/features/admin/components/ContentEditor.jsx`
- `src/features/admin/components/BlockContentEditor.jsx`
- `src/features/admin/components/PostGalleryField.jsx`
- `src/features/admin/components/ContentImportModal.jsx`
- `src/features/admin/components/ContentList.jsx`
- `src/features/admin/components/ContentToolbar.jsx`
- `src/features/admin/components/CommunicationsPanel.jsx`
- `src/features/admin/components/ChatPanel.jsx`
- `src/features/admin/components/MediaLibraryPanel.jsx`
- `src/features/admin/components/MediaPicker.jsx`
- `src/features/admin/components/SiteProfilePanel.jsx`
- `src/features/admin/components/UsersPanel.jsx`
- admin hooks that query Posts, Jobs, Applications, and their dashboard counts

Upload calls in the editor, gallery, media, communication, and site-profile components use
`spg/content`, `spg/posts`, or `spg/jobs` folders. Admin roles/permissions are built around
legacy `employee`, Posts, Jobs, Applications, corporate settings, communications, and Chat.

### Frontend services, dead files, and styles

- `src/services/httpClient.js` uses an SPG token key.
- `src/services/adminService.js` restricts content to Posts/Jobs and defaults to an SPG
  upload folder.
- `src/services/publicService.js` exposes Posts/Jobs/Applications.
- Chat, category, language, media, and site-profile services target legacy APIs/data.
- Unused legacy files `src/App.jsx`, `src/PublicApp.jsx`, `src/Admin.jsx`, `src/api.js`, and
  `src/index.css` contain a second old SPG application/auth implementation.
- `styles/factory-home.css` is explicitly designed around the footwear-manufacturing Home.
- SPG-prefixed classes/keyframes or old-domain styles also exist in
  `celebration-banner.css`, `detail-carousel-auto.css`, `footer-map.css`,
  `loading-polish.css`, `map-embed.css`, `public-communications.css`, `theme.css`, and the
  public/admin global style bundles.
- Local-storage/events use `spg-language`, `spg-theme`, `spg-chat-session`,
  `spg_public_notifications_v1`, and related event names. Rename them deliberately and
  decide whether any local state merits migration.

### Backend identity and domains

Direct old branding/configuration appears in:

- `back-end/package.json` and `package-lock.json` package names;
- `back-end/README.md`;
- `back-end/.env.example` database name;
- `back-end/src/config/env.js` database fallback;
- `back-end/src/server.js` startup log;
- `back-end/src/utils/cloudinary.js` SPG folder defaults/list prefixes;
- `back-end/src/controllers/admin.controller.js` upload allowlist;
- `back-end/src/controllers/contentImport.controller.js` document folders;
- `back-end/src/controllers/media.controller.js` media labels/prefix restrictions;
- `back-end/src/controllers/chat.controller.js` SPG/footwear/recruitment replies;
- `back-end/src/utils/openaiChat.js` corporate footwear system prompt;
- `back-end/src/app.test.js` and `back-end/src/utils/cvDownload.test.js` containing SPG
  paths and recruitment/CV examples.

Entire backend domains that are legacy even where the brand name is not repeated include:

- Job routes/controllers/import mappings in `routes/public.routes.js`,
  `routes/admin.routes.js`, `controllers/public.controller.js`,
  `controllers/admin.controller.js`, `controllers/contentImport.controller.js`, and
  `utils/contentImport.js`;
- Application/CV validation, storage, private download, and permissions in those routes,
  `middleware/application.js`, `middleware/upload.js`, `utils/cvDownload.js`, and
  `utils/permissions.js`;
- corporate Category defaults in `controllers/category.controller.js`;
- company profile, partner/location, banner, Notification, and media behavior in
  `controllers/siteProfile.controller.js`, `controllers/communications.controller.js`,
  and `controllers/media.controller.js`;
- public/admin visitor Chat, realtime registries, and OpenAI integration in
  `controllers/chat.controller.js`, `utils/realtime.js`, `utils/chatRealtime.js`, and
  `utils/openaiChat.js`;
- staff roles/permissions based on `admin` and `employee` in
  `controllers/account.controller.js`, `middleware/auth.js`, and `utils/permissions.js`.

### Repository documentation and samples

- root `README.md` still describes the former corporate site;
- `front-end/README.md` and `back-end/README.md` are legacy;
- `samples/IMPORT_GUIDE.md`, `samples/posts-import.csv`, and `samples/jobs-import.csv` are
  old Post/Job/recruitment examples;
- package names and the Git remote/repository name remain SPG-prefixed;
- reachable branch names, commit messages, and history retain the former product even
  after future current-tree cleanup.

Migration/audit documents may continue to name the old brand where necessary. Public
application code, public metadata, examples, and deployable assets must not.

### External assets and data not in Git

The ignored frontend environment points to a remote Cloudinary logo used by `Brand.jsx`.
The backend writes/lists/deletes under `spg/` and `spg/cv`. MongoDB-driven Posts, Jobs,
site profile, partner logos, banner images, social links, Chat, Applications, and CV
references may expose additional legacy or private material.

Do not query, migrate, delete, or publish these external systems without explicit
authorization, backup, ownership review, and a retention plan. Applicant names, contact
details, messages, and CVs are private data, not migration content.

## Security gate before any public launch

SEO/publication work must not publish the repository or a copied `.git` directory before
the security findings are handled:

- a fixed legacy admin token and a weak admin default are recoverable from reachable
  history;
- current MongoDB and Cloudinary credentials are recoverable from unreachable local Git
  blobs even though the working environment files are ignored;
- legacy Cloudinary upload presets, logo URLs, public IDs, and old provider hostnames exist
  in local objects/config history;
- there is no repository license or asset provenance record.

Rotate MongoDB and Cloudinary credentials, revoke legacy admin credentials/presets, and
move fully to `JWT_SECRET` before sharing the repository with `.git`. After rotation and
an approved backup, clean unreachable local objects without automatically rewriting shared
history. Keep the repository private until publication rights are confirmed.

## Migration policy

### 1. Establish the canonical origin

Before editing production SEO files:

1. confirm whether Mandora will use the existing hostname, a custom domain, or another
   verified origin;
2. record that exact origin in provider/environment configuration as `SITE_URL` (or one
   documented equivalent);
3. normalize scheme, host, and trailing-slash behavior in one helper;
4. use it for canonical links, Open Graph URLs, JSON-LD, sitemap URLs, robots sitemap
   reference, and redirect tests;
5. never emit localhost, a placeholder domain, or the old Pages hostname by fallback in a
   production build.

The canonical origin is a release-blocking input. This document intentionally has no
example production domain.

### 2. Inventory real indexed URLs

Before cutover, export and merge:

- Search Console indexed pages and submitted sitemap history;
- analytics landing pages if authorized;
- backlink/crawl data available to the site owner;
- current database Post/Job URLs if authorized;
- application route patterns and server/access logs if available;
- the old sitemap and any manually known campaign URLs.

Store no personal query data in the repository. The output should be a reviewed URL map,
not a raw private analytics export.

### 3. Decide every legacy URL outcome

For each old URL:

- use a permanent redirect only when Mandora has a genuine, closely equivalent canonical
  destination;
- return a deliberate gone/not-found response when unrelated corporate/recruitment content
  has no equivalent;
- never redirect all paths to Home;
- remove redirected/gone URLs from the new sitemap;
- keep old paths crawlable until search engines can observe the redirect or removal status;
- preserve query strings only when they remain meaningful and safe;
- prevent redirect chains and loops;
- keep approved redirects in the actual deployment output/configuration, not only a source
  file that the build omits.

Old Career and Company pages have no V1 Mandora equivalent by default. An old corporate
Post must not become a Blog redirect unless editors intentionally migrate it as relevant,
owned Mandora content.

### 4. Define indexability by surface

| Surface                                                                           | Default SEO policy                                                                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Home, Courses, Course Detail, public Lesson, public Vocabulary, public Quiz, Blog | Index only when the route is public, canonical, published, substantive, and returns a successful status. |
| Login and Register                                                                | `noindex`; keep out of sitemap.                                                                          |
| My Courses and Progress                                                           | Authenticated and `noindex`; keep out of sitemap.                                                        |
| Admin                                                                             | Authenticated and `noindex`; keep out of sitemap.                                                        |
| API routes                                                                        | Not public search pages; prevent indexing through response headers/hosting rules as appropriate.         |
| Draft/unpublished content                                                         | Not publicly retrievable; never in sitemap.                                                              |
| Unknown/deleted content                                                           | Real 404/410 behavior, never Home with 200.                                                              |

`robots.txt` disallow rules alone are not a substitute for `noindex`/authentication and
correct HTTP status behavior.

### 5. Deliver route-specific metadata

Every indexable public route needs metadata derived from approved content:

- unique, concise title;
- unique Vietnamese description appropriate to the page;
- one absolute canonical URL;
- consistent robots directive;
- Open Graph title, description, type, URL, and an owned image when available;
- Twitter card fields only if the same owned data is available;
- structured data whose type and fields truthfully match rendered content;
- breadcrumbs where the visible hierarchy supports them.

Use `WebSite`, Course-related, Article, or breadcrumb schema only when the page actually
meets the chosen schema's requirements. Do not fabricate ratings, prices, instructors,
authors, dates, course duration, enrollment counts, or organization details.

Metadata must be present in the delivered/rendered HTML for the route. Phase 1 must select
and verify a compatible rendering/build approach rather than assuming search crawlers will
execute every client request.

### 6. Generate sitemap and robots from verified configuration

The new sitemap must:

- use the confirmed canonical origin;
- include only canonical, indexable, published URLs that return success;
- cover the real public Mandora route types;
- escape XML correctly;
- use `lastmod` only when a trustworthy content timestamp exists;
- exclude admin, auth, student-private, draft, redirected, gone, and not-found URLs.

The new robots file must:

- reference the canonical sitemap;
- avoid the hardcoded old Pages hostname;
- support crawling of URLs that must be processed as redirects/410 during migration;
- not expose a private route merely by naming it;
- be tested from the deployed origin.

### 7. Resolve language behavior

The current interface switches `vi`, `en`, and `zh-tw` on the same URL using localStorage
and mutates `document.documentElement.lang`. It has no crawlable locale routes or hreflang.

Mandora targets Vietnamese learners, but Chinese lesson content is not automatically a
separate Chinese interface locale. Before adding hreflang or locale URLs, decide which UI
locales V1 actually supports. If only Vietnamese UI is approved, keep document language
and metadata Vietnamese while marking individual Chinese text appropriately in content.

## Cutover checklist

### Before implementation

- [ ] Rotate/revoke credentials and complete the repository publication security gate.
- [ ] Confirm asset/code publication rights and replace/quarantine the legacy favicon/logo.
- [ ] Confirm the production hostname and ownership of the old/new Search Console properties.
- [ ] Export the real indexed/backlinked URL inventory.
- [ ] Approve the redirect/410/not-found map.
- [ ] Decide public route patterns, content slugs, locale strategy, and rendering approach.
- [ ] Back up authorized legacy database/media before any destructive migration.

### During implementation

- [ ] Add a single verified `SITE_URL` configuration path with production validation.
- [ ] Replace all old static and runtime metadata, email, favicon, copy, and JSON-LD.
- [ ] Implement route-specific rendered metadata and stable public slugs.
- [ ] Implement true not-found/gone behavior and remove the wildcard-to-Home soft 404.
- [ ] Put working fallback/redirect files into the actual build/deployment output.
- [ ] Generate sitemap from published content and verified origin.
- [ ] Add noindex/auth protections for Login/Register, student-private, and Admin routes.
- [ ] Remove legacy public routes only after their URL outcomes are implemented.
- [ ] Ensure no production build embeds localhost, old provider URLs, or legacy remote logo.

### Deployment verification

- [ ] Inspect delivered HTML for each public route without relying only on the browser DOM.
- [ ] Verify title, description, canonical, robots, Open Graph, and JSON-LD per route.
- [ ] Verify one canonical host/scheme/trailing-slash policy.
- [ ] Verify old URLs return the approved 301/308, 404, or 410 behavior with no chains.
- [ ] Verify unknown URLs do not return Home with 200.
- [ ] Verify direct deep links load after a clean build/deploy.
- [ ] Verify `robots.txt` and sitemap are reachable and contain the confirmed origin.
- [ ] Validate sitemap XML and ensure every listed URL is canonical and successful.
- [ ] Verify Admin, Login/Register, My Courses, Progress, drafts, and API URLs are absent
      from sitemap and not indexable.
- [ ] Search deployed source/bundles for old brand names, old email, old hostname,
      `localhost`, and `spg/` media namespace references.

### After cutover

- [ ] Submit the new sitemap through the verified Search Console property.
- [ ] Request inspection of the canonical Home and representative public content routes.
- [ ] Monitor indexing, soft-404, duplicate/canonical, redirect, and crawl errors.
- [ ] Monitor old URLs until their redirects/removal states are processed.
- [ ] Keep the approved redirect map operational long-term.
- [ ] Review logs for unexpected legacy URLs and add explicit outcomes when warranted.
- [ ] Do not remove the old hostname/property until ownership, redirects, and monitoring
      obligations are satisfied.

## Release blockers still unknown

The repository cannot answer these items:

- the final Mandora production hostname;
- whether the old Pages hostname is still deployed and controlled;
- the current backend deployment/provider/origin;
- the complete indexed URL set;
- Search Console ownership;
- which legacy database/media records may be retained, deleted, or reused;
- asset/logo publication rights;
- final public slug patterns and locale policy;
- the rendering approach that will provide route-specific HTML metadata.

Resolve these inputs in Phase 1. Do not fill them with assumptions.
