# Phase 22: Test Mode Implementation - Research

**Researched:** 2026-03-27
**Domain:** Next.js 15 metadata API, env-var gating, SEO suppression, UI banner injection
**Confidence:** HIGH

## Summary

Phase 22 adds a single env-var gate (`NEXT_PUBLIC_IS_TEST_SITE`) that activates five behaviours: a visible "TESTSEITE" banner on every reader page, a visible "TESTSEITE" banner on every CMS/admin page, `noindex, nofollow` on every reader page, a fully-blocking `robots.txt`, a suppressed sitemap, and disabled AdSense script loading. No new dependencies are required. All mechanisms use existing Next.js 15 App Router APIs already in use in the codebase.

The project runs Next.js 15.5.14 with the App Router. The codebase has two layout trees: `src/app/(public)/layout.tsx` (reader) and `src/app/(admin)/layout.tsx` (CMS). The root `src/app/layout.tsx` is where the AdSense `<Script>` tag lives. Sitemap is at `src/app/sitemap.ts`, and no `robots.ts` file exists yet.

**Primary recommendation:** Inject all test-mode behaviours by touching exactly four files — root layout (AdSense gating), public layout (banner + noindex via `generateMetadata`), admin layout (banner), `src/app/robots.ts` (new file), and `src/app/sitemap.ts` (conditional suppression). No third-party libraries needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEO-01 | All pages serve `noindex, nofollow` meta tags when test mode is active | `generateMetadata` in public layout supports `robots` field; `{ index: false, follow: false }` renders correct meta tag |
| SEO-02 | `robots.txt` disallows all crawlers when test mode is active | `src/app/robots.ts` with `MetadataRoute.Robots` return type — Next.js 15 serves this as `/robots.txt` automatically |
| SEO-03 | Sitemap returns empty/minimal response when test mode is active | `src/app/sitemap.ts` already exists; conditional early return of empty array when env var set |
| TEST-01 | Visible "TESTSEITE" banner on every reader page | Banner component rendered in `src/app/(public)/layout.tsx` |
| TEST-02 | Visible "TESTSEITE" banner on every CMS/admin page | Banner component rendered in `src/app/(admin)/layout.tsx` |
| SAFETY-01 | AdSense script tags do not load when test mode is active | `NEXT_PUBLIC_IS_TEST_SITE` check in `src/app/layout.tsx` before rendering `<Script>` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.5.14 (installed) | Metadata API, route handlers, layout system | Already in use; built-in robots/sitemap support |
| React | 19.2.4 (installed) | Banner component | Already in use |
| Tailwind CSS v4 | ^4.2.2 (installed) | Banner styling | Already in use throughout the project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/script` | bundled with Next.js | AdSense `<Script>` tag | Already used in root layout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `generateMetadata` in layout | Per-page metadata | Layout-level is correct: one place, covers all child routes |
| `src/app/robots.ts` | Static `public/robots.txt` | `robots.ts` allows runtime env-var check; static file cannot be conditional |
| Empty sitemap array | 404 from a route handler | Empty `MetadataRoute.Sitemap` is cleaner and type-safe |

**Installation:** No new dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx              # MODIFY: gate AdSense Script on !isTestSite
│   ├── robots.ts               # CREATE: conditional Disallow: / when test mode
│   ├── sitemap.ts              # MODIFY: early return [] when test mode
│   ├── (public)/
│   │   └── layout.tsx          # MODIFY: add TestSiteBanner + generateMetadata with robots: noindex
│   └── (admin)/
│       └── layout.tsx          # MODIFY: add TestSiteBanner
└── components/
    └── TestSiteBanner.tsx      # CREATE: visual banner component
```

### Pattern 1: NEXT_PUBLIC env var as runtime gate

**What:** `NEXT_PUBLIC_` prefix makes the var available both server-side and in the browser bundle. Read as `process.env.NEXT_PUBLIC_IS_TEST_SITE`.

**When to use:** Any conditional that must work in both Server Components and Client Components.

**Example:**
```typescript
// Works in Server Components and Client Components
const isTestSite = process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'
```

**Important:** This is evaluated at build time for static pages. Since all reader pages use `export const dynamic = 'force-dynamic'`, the value is read at request time, which is correct for env-var gating on Vercel.

### Pattern 2: `generateMetadata` in a layout for noindex

**What:** Export `generateMetadata` from the public layout to inject `robots: { index: false, follow: false }` conditionally. Next.js 15 merges metadata from layout → page, so the layout-level robots field propagates to all child routes unless overridden.

**When to use:** When a behaviour must apply to all pages under a layout tree.

**Example:**
```typescript
// Source: Next.js 15.5.14 node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts
import type { Metadata } from 'next'

export function generateMetadata(): Metadata {
  const isTestSite = process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'
  if (!isTestSite) return {}
  return {
    robots: {
      index: false,
      follow: false,
    },
  }
}
```

This renders: `<meta name="robots" content="noindex, nofollow">` in the page source.

### Pattern 3: `src/app/robots.ts` for dynamic robots.txt

**What:** Next.js 15 App Router automatically serves `src/app/robots.ts` at `/robots.txt`. The `MetadataRoute.Robots` type is the return type.

**When to use:** When robots.txt content must be conditional on runtime env vars.

**Example:**
```typescript
// Source: Next.js 15.5.14 node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const isTestSite = process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'
  if (isTestSite) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ennstal-aktuell.at'}/sitemap.xml`,
  }
}
```

**Important:** The `host` field is optional and not needed. `rules.disallow: '/'` produces `Disallow: /` for all user agents.

### Pattern 4: Conditional sitemap suppression

**What:** In `src/app/sitemap.ts`, check the env var and return an empty array early. Next.js renders an empty `<urlset>` XML element with no `<url>` children. This satisfies SEO-03.

**Example:**
```typescript
// Modify existing src/app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') {
    return []
  }
  // ... existing logic
}
```

### Pattern 5: AdSense gating in root layout

**What:** In `src/app/layout.tsx`, conditionally render the `<Script>` tag. The `NEXT_PUBLIC_` prefix ensures the value is inlined into the client bundle.

**Example:**
```typescript
// Modify src/app/layout.tsx
const isTestSite = process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'

// Inside JSX:
{!isTestSite && (
  <Script
    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
    strategy="afterInteractive"
    crossOrigin="anonymous"
  />
)}
```

### Pattern 6: TestSiteBanner component

**What:** A simple React Server Component that reads the env var and renders a fixed-position banner.

**When to use:** Render at the top of both the public layout and the admin layout.

**Example:**
```typescript
// src/components/TestSiteBanner.tsx
export function TestSiteBanner() {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE !== 'true') return null
  return (
    <div
      className="w-full bg-yellow-400 text-black text-center text-sm font-bold py-1 z-50"
      role="banner"
    >
      TESTSEITE — Diese Seite ist nicht öffentlich zugänglich
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Static `public/robots.txt`:** Cannot be made conditional on env vars. A `robots.ts` App Router file is required.
- **Per-page `generateMetadata` for noindex:** Requires touching every page. Layout-level covers all children.
- **Middleware for noindex injection:** Correct in theory but unnecessary complexity when `generateMetadata` in layout achieves the same result.
- **Client component for banner:** Banner content is static — Server Component is correct and avoids hydration cost.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| robots.txt serving | Express route, manual file write | `src/app/robots.ts` with `MetadataRoute.Robots` | Next.js 15 handles content-type, caching, and serving automatically |
| noindex meta injection | `<meta>` in layout JSX head | `generateMetadata` returning `robots` field | Next.js deduplicates and positions metadata correctly |
| Sitemap suppression | Returning a 404 or empty XML string | Return `[]` from `sitemap.ts` | Type-safe, correct XML wrapper, handled by framework |

**Key insight:** Every mechanism needed in this phase is a first-class Next.js 15 App Router feature. No custom HTTP handling is needed.

## Common Pitfalls

### Pitfall 1: Conflict between static `public/robots.txt` and `src/app/robots.ts`
**What goes wrong:** If a `public/robots.txt` file exists, it takes priority over `src/app/robots.ts`. The dynamic route is silently ignored.
**Why it happens:** Next.js serves files in `public/` before App Router routes.
**How to avoid:** Confirm no `public/robots.txt` exists. (Verified: none exists in this project.)
**Warning signs:** `GET /robots.txt` always returns the same content regardless of env var.

### Pitfall 2: `NEXT_PUBLIC_` var not set on Vercel deployment
**What goes wrong:** `process.env.NEXT_PUBLIC_IS_TEST_SITE` is `undefined`, `isTestSite` evaluates to `false`, and all test-mode behaviours are silently skipped.
**Why it happens:** Vercel requires explicit env var configuration in the dashboard or `vercel.json`.
**How to avoid:** The planner should include a verification task that checks the live URL for the TESTSEITE banner and `noindex` meta tag after deploy.
**Warning signs:** No banner visible on Vercel deployment after this phase's code is deployed.

### Pitfall 3: `generateMetadata` in layout overriding page-specific metadata
**What goes wrong:** If a page also exports `generateMetadata`, Next.js merges metadata from layout + page. The `robots` field from layout is overridden by the page if the page also sets `robots`.
**Why it happens:** Next.js metadata merging: page-level values override layout-level values for the same key.
**How to avoid:** Check that existing pages don't export a `robots` metadata field. (Verified: `src/lib/reader/metadata.ts` does not set `robots`.) The test-mode layout `generateMetadata` will propagate cleanly to all reader pages.
**Warning signs:** Some pages serve `noindex` and others don't.

### Pitfall 4: Admin layout is not a Server Component with metadata support
**What goes wrong:** The `(admin)/layout.tsx` uses `cookies()` and performs a redirect — it is already a Server Component. However, exporting `generateMetadata` from an admin layout that does auth checks may require care.
**Why it happens:** `generateMetadata` runs independently of the layout render in Next.js 15. Auth logic in the layout does not block `generateMetadata`.
**How to avoid:** The banner component approach (Pattern 6) for admin is simpler than using `generateMetadata` in the admin layout. Since the admin pages are not crawled anyway (they redirect to login), `noindex` on admin is not a hard requirement — only the banner (TEST-02) is needed.

### Pitfall 5: `robots.ts` requires `export const dynamic = 'force-dynamic'` if env var changes between deploys
**What goes wrong:** By default, Next.js may cache the robots.txt response if the function has no dynamic inputs.
**Why it happens:** Next.js 15 static optimization can cache route responses at build time.
**How to avoid:** Add `export const dynamic = 'force-dynamic'` to `robots.ts` to ensure the env var is read at request time. This is consistent with `sitemap.ts` which already has this export.

## Code Examples

Verified patterns from official Next.js 15.5.14 source:

### robots.ts — full test-mode implementation
```typescript
// Source: Next.js 15.5.14 MetadataRoute.Robots type (node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts)
import type { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ennstal-aktuell.at'}/sitemap.xml`,
  }
}
```

### generateMetadata in public layout — noindex injection
```typescript
// Source: Next.js 15.5.14 Metadata type, robots field
import type { Metadata } from 'next'

export function generateMetadata(): Metadata {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE !== 'true') return {}
  return {
    robots: { index: false, follow: false },
  }
}
```

Rendered output: `<meta name="robots" content="noindex, nofollow"/>`

### sitemap.ts — suppression
```typescript
// Modify existing src/app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') {
    return []
  }
  // ... existing logic unchanged
}
```

### Root layout — AdSense gating
```typescript
// Modify src/app/layout.tsx
const isTestSite = process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'
// In JSX:
{!isTestSite && (
  <Script
    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
    strategy="afterInteractive"
    crossOrigin="anonymous"
  />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `public/robots.txt` | `src/app/robots.ts` with `MetadataRoute.Robots` | Next.js 13+ App Router | Runtime-conditional robots.txt without custom route handlers |
| Manual `<meta>` in `_document.tsx` | `generateMetadata` / `metadata` export | Next.js 13+ App Router | Framework-managed deduplication and merging |
| Pages Router `getServerSideProps` | App Router layout `generateMetadata` | Next.js 13+ | Server Component, no client overhead |

**Deprecated/outdated:**
- `pages/_document.tsx` for meta tags: replaced by App Router `metadata` export. This project uses App Router exclusively.
- `next-sitemap` npm package: not needed; built-in `src/app/sitemap.ts` is sufficient and is already used.

## Open Questions

1. **AdSense silently no-ops on unverified Vercel domains**
   - What we know: STATE.md notes "AdSense silently no-ops on unverified Railway/Vercel domains. Confirm during Phase 22 whether explicit gating is needed."
   - What's unclear: Whether the `<Script>` tag being present but non-functional is sufficient for SAFETY-01, or whether SAFETY-01 strictly requires the script tag to not be present in the DOM.
   - Recommendation: Implement explicit gating (SAFETY-01 says "do not load" — script tag absent is the correct interpretation). The proposed gating in root layout satisfies this requirement regardless of AdSense verification status.

2. **generateMetadata in (public)/layout.tsx — interaction with article page's generateMetadata**
   - What we know: `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` exports `generateMetadata` that returns title, description, alternates, and openGraph — no `robots` field.
   - What's unclear: Confirmed via metadata.ts review that `robots` is not set per-page, so layout `robots` propagates correctly.
   - Recommendation: No action needed; the layout-level robots field will apply to all reader pages.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/components/TestSiteBanner.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEO-01 | `generateMetadata` returns `robots: {index:false, follow:false}` when env var set | unit | `npx vitest run src/app/__tests__/public-layout-metadata.test.ts` | ❌ Wave 0 |
| SEO-02 | `robots()` returns `Disallow: /` when env var set | unit | `npx vitest run src/app/__tests__/robots.test.ts` | ❌ Wave 0 |
| SEO-03 | `sitemap()` returns `[]` when env var set | unit | `npx vitest run src/app/__tests__/sitemap-testmode.test.ts` | ❌ Wave 0 |
| TEST-01 | `TestSiteBanner` renders when env var set, null otherwise | unit | `npx vitest run src/components/TestSiteBanner.test.tsx` | ❌ Wave 0 |
| TEST-02 | `TestSiteBanner` is present in admin layout tree | unit | `npx vitest run src/components/TestSiteBanner.test.tsx` | ❌ Wave 0 |
| SAFETY-01 | AdSense Script tag absent from DOM when env var set | unit | `npx vitest run src/app/__tests__/root-layout-adsense.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/TestSiteBanner.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/TestSiteBanner.test.tsx` — covers TEST-01, TEST-02 (banner renders/returns null)
- [ ] `src/app/__tests__/robots.test.ts` — covers SEO-02 (robots function output)
- [ ] `src/app/__tests__/sitemap-testmode.test.ts` — covers SEO-03 (sitemap returns empty array)
- [ ] `src/app/__tests__/public-layout-metadata.test.ts` — covers SEO-01 (generateMetadata output)
- [ ] `src/app/__tests__/root-layout-adsense.test.ts` — covers SAFETY-01 (Script tag conditional)

Note: All new tests follow the existing Vitest pattern in `src/components/reader/AdUnit.test.tsx` — mock env vars with `process.env`, test function output directly.

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts` — `MetadataRoute.Robots`, `RobotsFile`, `SitemapFile`, `Metadata.robots` types, verified directly from installed Next.js 15.5.14
- `src/app/sitemap.ts` — existing implementation pattern, `MetadataRoute.Sitemap`, `force-dynamic` export
- `src/app/layout.tsx` — existing AdSense `<Script>` tag location and pattern
- `src/app/(public)/layout.tsx` — reader layout structure
- `src/app/(admin)/layout.tsx` — admin layout structure
- `src/lib/reader/metadata.ts` — confirmed no `robots` field in per-page metadata
- `.planning/REQUIREMENTS.md` — requirement definitions
- `.planning/STATE.md` — locked decisions: `NEXT_PUBLIC_IS_TEST_SITE` canonical name, single env var approach

### Secondary (MEDIUM confidence)
- `src/components/reader/AdUnit.test.tsx` — established test pattern using `process.env` manipulation with Vitest

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries verified against installed versions
- Architecture: HIGH — All patterns derived from existing codebase files and installed Next.js 15.5.14 type definitions
- Pitfalls: HIGH — Derived from code inspection (no `public/robots.txt`, no `robots` field in existing metadata helpers) and Next.js framework behaviour

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable — Next.js App Router metadata API is mature)
