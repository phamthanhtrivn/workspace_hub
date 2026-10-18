# Web metadata and indexing

All 17 application pages declare server-rendered metadata using `lib/seo.ts` and
the generic page copy in `lib/page-metadata.ts`. The root supplies the brand title
template. Auth and workspace layouts default to `noindex, nofollow`; the shared
document page also explicitly disables indexing. Settings and Notifications are
overlays rather than separate routes.

## Current configuration: indexing off

There is no production domain yet. Keep these values in the existing frontend
environment (do not replace its API/OAuth settings):

```dotenv
SITE_URL=
SITE_INDEXABLE=false
```

With this configuration all pages are `noindex`, no canonical or absolute social
URLs are emitted, and `/sitemap.xml` contains no URLs. `/robots.txt` permits
crawling so engines can read `noindex`; it does not advertise a sitemap while
indexing is off. Authentication and permissions remain the access controls.

The branded, generic PNG is available at `/social-image` (1200×630), but is not
advertised in social metadata until a trusted site origin is configured. The
navy W tab icon replaces the starter favicon. No private content or IDs are used
in metadata, and no authenticated fetch is made to generate it.

## When a domain is available

1. Set `SITE_URL` to the confirmed public HTTPS frontend origin, without a path,
   credentials, query, fragment or custom port. API/asset URLs are not substitutes.
2. Set `SITE_INDEXABLE=true` only for public production. The helper rejects this
   setting without a valid origin or outside `NODE_ENV=production`.
3. Set the matching GitHub production environment variables and rebuild the web
   image in a new commit. Docker carries the same values through build and runtime;
   static metadata, robots and sitemap may be generated during the build.
4. Check canonical, social preview URLs, robots and sitemap on the actual host.
   Only `/` is indexable and listed in the sitemap. Other pages keep `noindex`.

Keep preview/staging builds at `SITE_INDEXABLE=false` even when they use production
mode. GitHub trial image builds force indexing off and omit the origin. Do not
promote an already indexable image to preview or override these values only after
build: build and runtime metadata must agree. Immutable image reuse means changing
GitHub variables alone does not rewrite an existing SHA image.

## Adding a page

- Add its generic English title/description to `PAGE_METADATA` and export
  `createPageMetadata(route)` from the server page. Keep interactive rendering in
  its feature component.
- Use the plain page name; the root adds `| WorkspaceHub` once. Homepage uses an
  absolute title and owns its canonical, Open Graph and Twitter metadata.
- Do not inherit a homepage canonical or add tokens, query filters, user names,
  task titles or document/project names to metadata. New public indexable pages
  require an explicit indexing decision and sitemap allowlist update.
- Keep the generic dynamic-route resolution in `getPageTitle` current. Pomodoro
  displays its existing countdown while running and restores the current route's
  title on pause/reset/completion rather than its original mounting page.

Verification uses the existing ESLint, TypeScript and production build commands;
no additional test runner, package or script is required. Actual indexing and
Search Console submission are separate deployment/account operations.
