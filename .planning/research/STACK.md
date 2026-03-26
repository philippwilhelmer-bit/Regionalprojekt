# Stack Research

**Domain:** Test deployment configuration — TESTSEITE banner, noindex/nofollow, robots.txt, Railway hosting
**Researched:** 2026-03-26
**Confidence:** HIGH

## Context: Milestone Scope

This is a SUBSEQUENT MILESTONE on an existing Next.js 15 / Prisma v6 / PostgreSQL / Tailwind CSS v4 app.

Validated stack (do NOT re-research): Next.js 15, Prisma v6, PostgreSQL, Anthropic Claude API, Tailwind CSS v4, Vitest with pgLite, Server Components, HMAC auth CMS.

Four new capabilities required for v1.2:
1. TESTSEITE banner on every page (reader + admin CMS)
2. `robots` noindex/nofollow meta tags on all pages
3. `robots.txt` disallowing all crawlers
4. Railway deployment with live shareable URL

**Bottom line: no new npm packages are needed.** All four features are implemented within the existing stack using Next.js built-ins, Tailwind, and Railway's platform features.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js Metadata API — `robots` field | built-in, Next.js 15.5.x | Injects `<meta name="robots" content="noindex, nofollow" />` on all pages | Native API verified against official docs (updated 2026-03-20). Set `robots: { index: false, follow: false }` in the root `app/layout.tsx` metadata export. Propagates to all routes automatically because no child route currently overrides `robots`. Zero dependencies. |
| Next.js `app/robots.ts` file convention | built-in, Next.js 15.5.x | Generates the `/robots.txt` HTTP response | File convention introduced in v13.3.0, fully stable in v15. Exports a `MetadataRoute.Robots` object. Route Handler is cached by default. Replaces any static `public/robots.txt`. No additional packages required. |
| `NEXT_PUBLIC_IS_TEST_SITE` environment variable | Node.js built-in | Single flag that gates: noindex metadata, robots.txt disallow-all, and TESTSEITE banner visibility | `NEXT_PUBLIC_` prefix makes the value available in both Server Components (at request time) and Client Components (inlined at build time). Consistent with the existing pattern in this project (`NEXT_PUBLIC_ADSENSE_PUB_ID`). Set to `true` in Railway for the test deployment, omit or set to `false` for production. |
| Railway | PaaS platform | Hosts the test deployment and provides a public shareable URL | First-class Next.js support via Nixpacks/Railpack auto-detection. PostgreSQL addon available as a first-class service with automatic `DATABASE_URL` injection. Prisma's official docs list Railway as a supported deployment target. Free tier covers a test deployment of this scale. |

### Supporting Libraries

No new packages required.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| *(none)* | — | — | All needed functionality is built into Next.js 15 and the Railway platform. Adding `next-seo` or any other SEO library would be redundant. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Railway CLI (`railway`) | Optional: set env vars, run one-off commands (`railway run npx prisma migrate deploy`) | Local dev tool only — `npm install -g @railway/cli`. Not added to `package.json`. |
| `railway.toml` (optional) | Override build or start command in-repo if auto-detection needs adjustment | Only create if Railway's auto-detection of the Next.js build fails. Not required by default. |

---

## Installation

```bash
# No new npm packages required for this milestone.

# Railway CLI — optional local developer tool, not added to package.json
npm install -g @railway/cli
# or: brew install railway
```

---

## Implementation Patterns

### 1. NEXT_PUBLIC_IS_TEST_SITE environment variable

All four features (banner, noindex metadata, robots.txt, and any future test-mode gates) read this single variable. Setting it in Railway's dashboard to `true` activates test mode for that deployment.

```
# Railway dashboard → Service → Variables
NEXT_PUBLIC_IS_TEST_SITE=true
```

### 2. noindex/nofollow via Metadata API (root layout)

Add to the `metadata` export in `app/layout.tsx`. The existing file already exports `metadata: Metadata` — add the `robots` field.

Because Next.js metadata merging is shallow, child routes that define their own `robots` object would override this. Currently no child route in this project defines `robots`, so root-level is sufficient.

```ts
// app/layout.tsx
export const metadata: Metadata = {
  title: config.siteName,
  description: "Aktuelle Nachrichten aus der Steiermark",
  robots:
    process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'
      ? { index: false, follow: false }
      : { index: true, follow: true },
}
```

**Critical:** `metadata` is a static constant evaluated at build time in Next.js. `NEXT_PUBLIC_IS_TEST_SITE` must be set as a Railway environment variable *before the build runs*, because `NEXT_PUBLIC_*` values are inlined into the bundle during `next build`. This is the correct behavior — the test build is permanently noindex by design.

Output when `NEXT_PUBLIC_IS_TEST_SITE=true`:
```html
<meta name="robots" content="noindex, nofollow" />
```

### 3. Dynamic robots.txt (`app/robots.ts`)

Create a new file at `app/robots.ts`. This is a Route Handler that serves `/robots.txt`.

```ts
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.ennstal-aktuell.at'}/sitemap.xml`,
  }
}
```

Note: `robots.ts` is a Route Handler evaluated at runtime (server-side), not at build time. `process.env.NEXT_PUBLIC_IS_TEST_SITE` works here as a standard server env var even though it carries the `NEXT_PUBLIC_` prefix. No issue — the prefix just also enables client-side access; it doesn't restrict server-side access.

### 4. TESTSEITE banner component

A fixed-position banner injected at the top of both public and admin layout trees. It must appear on every page including the CMS. No new npm dependency needed — pure Tailwind.

The banner reads `process.env.NEXT_PUBLIC_IS_TEST_SITE` in a Server Component, so it is rendered conditionally server-side (no hydration cost when inactive).

Inject into both existing layouts:
- `src/app/(public)/layout.tsx` — reader frontend
- `src/app/(admin)/layout.tsx` — CMS admin

```tsx
// Example banner — placed inside layout JSX, above other content
{process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true' && (
  <div className="fixed top-0 inset-x-0 z-50 bg-yellow-400 text-yellow-900 text-center text-sm font-semibold py-1">
    TESTSEITE — Kein öffentlicher Betrieb
  </div>
)}
```

The banner does not need its own file — inline JSX in both layouts is sufficient. If the design system requires it to be a named component, place it in `src/components/TestBanner.tsx`.

### 5. Railway deployment configuration

Railway auto-detects Next.js and runs `npm run build` then `npm run start`. No `Dockerfile` or `railway.toml` needed unless auto-detection fails.

**Required environment variables in Railway dashboard:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Reference Railway Postgres addon: `${{Postgres.DATABASE_URL}}` |
| `ADMIN_PASSWORD` | Secure test password |
| `ADMIN_SESSION_SECRET` | 32+ char random string |
| `NEXT_PUBLIC_IS_TEST_SITE` | `true` |
| `NEXT_PUBLIC_ADSENSE_PUB_ID` | `ca-pub-0000000000000000` (placeholder — suppress real ads on test) |
| `ANTHROPIC_API_KEY` | Real key if AI pipeline should run; omit to disable generation |
| `NEXT_PUBLIC_BASE_URL` | The Railway-generated URL (set after first deploy) |

**Prisma migrations on deploy:**

Railway does not automatically run `prisma migrate deploy`. Configure it as part of the build command in Railway's dashboard:

```
npx prisma migrate deploy && npm run build
```

Or add to `package.json` scripts:
```json
"build": "prisma migrate deploy && next build"
```

The `postinstall` approach (running `prisma generate`) is already handled by Prisma's npm lifecycle hooks when installed. Prisma client will be regenerated for Railway's Linux environment automatically.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Native `app/robots.ts` | Static `public/robots.txt` | Use static file only if the robots content is identical across all deployment environments. Not appropriate here because the test deployment needs `Disallow: /` while production needs `Allow: /`. The `robots.ts` approach handles both from one codebase. |
| Native Metadata API `robots` field | `next-seo` package | `next-seo` was the standard approach before Next.js 13 introduced the Metadata API. On Next.js 15 using `next-seo` alongside the native Metadata API creates duplication and potential conflicts. Native API is authoritative. |
| `NEXT_PUBLIC_IS_TEST_SITE` env var | `NODE_ENV` check | `NODE_ENV` in Next.js production builds is always `'production'` — it does not distinguish staging or test deployments from the live site. A dedicated env var is the standard pattern for test/staging environment detection. |
| `NEXT_PUBLIC_IS_TEST_SITE` env var | `NEXT_PUBLIC_VERCEL_ENV` or `RAILWAY_ENVIRONMENT` | Platform-injected variables have inconsistent names, are not available in local dev, and create a platform lock-in. An explicit `NEXT_PUBLIC_IS_TEST_SITE=true` is self-documenting and works identically on Railway, locally, and on any other platform. |
| Railway | Vercel | Vercel is the canonical Next.js host but requires a paid team plan for features needed at production scale. For a shareable test URL, Railway's free tier is sufficient and its PostgreSQL addon exactly matches the project's existing database. |
| Railway | Render, Fly.io | Both are valid alternatives but require more manual configuration for Next.js + PostgreSQL. Railway's Nixpacks/Railpack auto-detects Next.js with zero configuration and its PostgreSQL addon integrates via `${{Postgres.DATABASE_URL}}` reference syntax. |
| Inline banner JSX in layouts | Middleware-injected HTML | Middleware runs on the Edge runtime and cannot inject React JSX. Inline JSX in Server Component layouts is simpler, type-safe, and zero-overhead when `NEXT_PUBLIC_IS_TEST_SITE` is not set. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-seo` | Redundant with Next.js 15 native Metadata API. Adding it to this project creates two competing robots-tag sources. | Native `metadata` export and `app/robots.ts` |
| Static `public/robots.txt` | Cannot be conditional — a static file serves the same content regardless of deployment environment. The test deployment needs `Disallow: /`; production needs `Allow: /`. | `app/robots.ts` Route Handler |
| `X-Robots-Tag` HTTP header via middleware | Overkill for this case; the `<meta name="robots">` tag approach is standard and sufficient. Middleware-level headers are a fallback when meta tags cannot be used (e.g., non-HTML responses). | Metadata API `robots` field in root layout |
| `postinstall` for `prisma migrate deploy` | Running migrations on `npm install` would execute on developer machines during local dependency installs, which is dangerous. | Add `prisma migrate deploy` to Railway's build command override in the dashboard |
| Separate shared layout component for the banner | Unnecessary abstraction. The banner is a single conditional JSX expression in two existing layout files. A shared component adds a file with no reuse benefit beyond those two locations. | Inline JSX in `(public)/layout.tsx` and `(admin)/layout.tsx`; or a `src/components/TestBanner.tsx` if the design system requires a named component |

---

## Stack Patterns by Variant

**If test and production are separate Railway services (recommended):**
- Test service: `NEXT_PUBLIC_IS_TEST_SITE=true`, PostgreSQL addon seeded with test data
- Production service: `NEXT_PUBLIC_IS_TEST_SITE` unset or `false`, separate PostgreSQL addon with real data
- Both services deploy from the same Git repository; Railway environment variables differ per service

**If Railway auto-detection fails for the build:**
- Add `railway.toml` to the repo root:
  ```toml
  [deploy]
  startCommand = "npm run start"
  [build]
  buildCommand = "npx prisma migrate deploy && npm run build"
  ```

**If the banner needs to avoid layout shift on body-padding pages:**
- Add `pt-8` (or equivalent) to the `<body>` or outer wrapper element in the affected layouts when `NEXT_PUBLIC_IS_TEST_SITE === 'true'`

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 15.5.x | `MetadataRoute.Robots` type | Available since v13.3.0; fully stable in v15. Import from `'next'`. |
| Next.js 15.5.x | `metadata.robots` object | `{ index: false, follow: false }` → `<meta name="robots" content="noindex, nofollow" />`. Verified against official docs (2026-03-20). |
| Prisma v6 | Railway PostgreSQL | Standard `DATABASE_URL` connection string. Prisma v6 generates client for the target platform during build — Railway's Linux environment is supported out of the box. |
| `NEXT_PUBLIC_*` variables | Railway build pipeline | Must be set in Railway dashboard *before* the build runs. Railway injects them into the build environment. Changes require a redeploy to take effect in client bundles. |

---

## Sources

- [Next.js `generateMetadata` — `robots` field](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#robots) — HIGH confidence, official docs verified 2026-03-20
- [Next.js `app/robots.ts` file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) — HIGH confidence, official docs verified 2026-03-20 (doc version 16.2.1)
- [Railway Next.js deployment guide](https://docs.railway.com/guides/nextjs) — MEDIUM confidence (WebSearch confirmed; direct fetch blocked by tool permissions)
- [Railway environment variables](https://docs.railway.com/variables) — MEDIUM confidence (WebSearch-confirmed; `${{Service.VAR}}` reference syntax for addon linking)
- [Prisma deploy to Railway](https://www.prisma.io/docs/orm/prisma-client/deployment/traditional/deploy-to-railway) — MEDIUM confidence (official Prisma docs, confirmed via WebSearch)

---

*Stack research for: Test deployment infrastructure (TESTSEITE banner, noindex/nofollow, robots.txt, Railway hosting)*
*Researched: 2026-03-26*
