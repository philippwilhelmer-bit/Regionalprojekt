# Architecture Research

**Domain:** Test deployment integration for Next.js 15 news platform (v1.2 milestone)
**Researched:** 2026-03-26
**Confidence:** HIGH (verified against Next.js 15 official docs, current date 2026-03-26)

---

## Scope Note

This file covers the v1.2 milestone only: how TESTSEITE banner, noindex meta tags, robots.txt, and Railway deployment integrate with the existing architecture. The full platform architecture from v1.0 is preserved in the section at the bottom.

---

## v1.2 Integration Overview

The four test deployment features touch different layers of the existing app. None require schema changes, new data models, or changes to the ingestion/AI pipeline.

```
┌──────────────────────────────────────────────────────────────────┐
│                     EXISTING APP (v1.1)                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│   src/app/layout.tsx          ← ADD: robots noindex metadata      │
│   src/app/robots.ts           ← NEW: disallow-all robots.txt      │
│   src/app/(public)/layout.tsx ← ADD: TestBanner component         │
│   src/app/(admin)/layout.tsx  ← ADD: TestBanner component         │
│                                                                    │
│   src/components/TestBanner.tsx  ← NEW: TESTSEITE banner          │
│                                                                    │
│   .env / Railway env vars     ← ADD: NEXT_PUBLIC_TEST_MODE=true   │
│   railway.toml (or Railway UI) ← NEW: deployment config           │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

All four features are gated by a single environment variable: `NEXT_PUBLIC_TEST_MODE`. When `true`, all test-mode behaviors activate. When absent or `false`, the app behaves identically to production.

---

## Component Responsibilities

### New Components

| Component | File | Responsibility |
|-----------|------|----------------|
| TestBanner | `src/components/TestBanner.tsx` | Fixed-position "TESTSEITE" bar rendered on every page in test mode |
| robots.ts | `src/app/robots.ts` | Generates `/robots.txt` dynamically; disallows all crawlers in test mode |

### Modified Files

| File | Change | Why |
|------|--------|-----|
| `src/app/layout.tsx` | Add `robots: { index: false, follow: false }` to metadata export when `NEXT_PUBLIC_TEST_MODE=true` | Root layout metadata applies to all pages via Next.js metadata inheritance |
| `src/app/(public)/layout.tsx` | Render `<TestBanner />` before `<Header>` | Public layout wraps all reader pages |
| `src/app/(admin)/layout.tsx` | Render `<TestBanner />` inside the shell | Admin layout wraps all CMS pages |

---

## Recommended Project Structure (additions only)

```
src/
├── app/
│   ├── robots.ts              ← NEW: generates /robots.txt
│   ├── layout.tsx             ← MODIFY: add conditional robots metadata
│   ├── (public)/
│   │   └── layout.tsx         ← MODIFY: add <TestBanner />
│   └── (admin)/
│       └── layout.tsx         ← MODIFY: add <TestBanner />
└── components/
    └── TestBanner.tsx         ← NEW: banner component
```

No new folders. No changes to lib/, prisma/, or scripts/.

---

## Architectural Patterns

### Pattern 1: Environment Variable Gate

**What:** A single `NEXT_PUBLIC_TEST_MODE` env var controls all test-mode behaviors. Checking it in one place (the root layout for metadata, each layout for banner) keeps the logic explicit and easy to remove.

**When to use:** Feature flags that span multiple rendering concerns (metadata + UI) and must be zero-cost in production.

**Trade-offs:** `NEXT_PUBLIC_` prefix makes the value available in client components (needed for the banner). This is intentional — the banner is client-visible by design. The robots metadata is server-rendered from this same value.

**Example:**
```typescript
// src/app/layout.tsx
const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

export const metadata: Metadata = {
  title: config.siteName,
  description: "Aktuelle Nachrichten aus der Steiermark",
  ...(isTestMode && {
    robots: { index: false, follow: false },
  }),
}
```

### Pattern 2: Dynamic robots.ts (Next.js 15 file convention)

**What:** `src/app/robots.ts` exports a default function returning a `MetadataRoute.Robots` object. Next.js 15 auto-serves this at `/robots.txt`. The function checks `NEXT_PUBLIC_TEST_MODE` and returns either "disallow all" or "allow all".

**When to use:** Whenever robots.txt content must vary between environments. The file-based convention is cleaner than placing a static `robots.txt` in `public/` because it can respond to runtime config.

**Trade-offs:** File-based metadata (robots.ts) has higher priority than `metadata` object. This means the robots.txt and the meta robots tag are controlled separately — both must be set for complete noindex coverage.

**Example:**
```typescript
// src/app/robots.ts
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ennstal-aktuell.at'
const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

export default function robots(): MetadataRoute.Robots {
  if (isTestMode) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

### Pattern 3: Fixed-Position Banner Component

**What:** `TestBanner` is a Server Component that renders a visually prominent fixed bar only when `NEXT_PUBLIC_TEST_MODE === 'true'`. Because the value is read at server render time, there is no client hydration flash.

**When to use:** Any UI element that must appear on every page across multiple layout trees (both public and admin layouts).

**Trade-offs:** Inserting in both layout files means two places to add/remove. This is acceptable because there are only two layouts and the change is a single line in each. A global insertion in `src/app/layout.tsx` (the root layout) is cleaner but the root layout does not render the `<body>` structure shared by both public and admin — it wraps everything, but adding it before `{children}` in the root layout is the simplest approach.

**Placement decision:** The root `layout.tsx` already wraps both `(public)` and `(admin)` route groups. Adding the banner once in the root layout body is simpler than adding it in two child layouts.

**Example:**
```typescript
// src/components/TestBanner.tsx (Server Component, no 'use client' needed)
export function TestBanner() {
  if (process.env.NEXT_PUBLIC_TEST_MODE !== 'true') return null
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#b91c1c', color: '#fff',
        textAlign: 'center', padding: '6px',
        fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em',
      }}
    >
      TESTSEITE — Kein offizielles Angebot — Nicht für Suchmaschinen sichtbar
    </div>
  )
}
```

---

## Data Flow

### Test Mode Activation Flow

```
Railway deployment
    ↓
Environment variable: NEXT_PUBLIC_TEST_MODE=true
    ↓
Next.js build / runtime reads process.env
    ↓
    ├── root layout.tsx → metadata.robots = { index: false, follow: false }
    │       → <meta name="robots" content="noindex, nofollow"> on every page
    │
    ├── src/app/robots.ts → GET /robots.txt
    │       → "User-agent: *\nDisallow: /"
    │
    └── src/app/layout.tsx body → <TestBanner />
            → Fixed red bar on every page (public + admin)
```

### Production Deployment Flow (unchanged)

```
Production deployment
    ↓
NEXT_PUBLIC_TEST_MODE not set (or 'false')
    ↓
    ├── metadata.robots not added → pages are indexable by default
    ├── robots.ts → "User-agent: *\nAllow: /\nSitemap: ..."
    └── TestBanner returns null → no banner rendered
```

---

## Integration Points

### New vs Modified: Explicit Inventory

| Item | Type | Integration Point | Notes |
|------|------|-------------------|-------|
| `NEXT_PUBLIC_TEST_MODE` env var | New | Railway env vars panel | Set to `"true"` for test deployment; absent in production |
| `NEXT_PUBLIC_BASE_URL` env var | Existing (likely) | Railway env vars panel | Already used by sitemap.ts; set to Railway URL for test deployment |
| `src/app/robots.ts` | New file | Next.js file convention, auto-served at `/robots.txt` | No route conflict — no existing `public/robots.txt` found |
| `src/components/TestBanner.tsx` | New file | Imported in root layout | Server Component, no client bundle cost |
| `src/app/layout.tsx` metadata export | Modified | Conditional robots field | Does not break existing metadata structure |
| `src/app/(public)/layout.tsx` | Potentially modified | Only if banner not placed in root layout | See placement decision above |
| `src/app/(admin)/layout.tsx` | Potentially modified | Only if banner not placed in root layout | See placement decision above |
| `railway.toml` | New file (optional) | Railway deployment | Can use Railway UI instead; toml gives IaC reproducibility |

### Build Order for This Milestone

Dependencies are minimal. Build order:

```
1. Add NEXT_PUBLIC_TEST_MODE env var to .env.example
        ↓
2. Create src/app/robots.ts
   (no deps — standalone file convention)
        ↓
3. Create src/components/TestBanner.tsx
   (no deps — reads env var, renders HTML)
        ↓
4. Modify src/app/layout.tsx
   (add robots metadata + import TestBanner)
        ↓
5. Configure Railway deployment
   (set env vars, connect repo, deploy)
```

Steps 2 and 3 are independent and can be done in either order. Step 4 depends on step 3 (needs the component to exist). Step 5 depends on steps 2-4 (app must be correct before deploying).

---

## Anti-Patterns

### Anti-Pattern 1: Static robots.txt in public/

**What people do:** Drop a `public/robots.txt` file with `Disallow: /` and call it done.
**Why it's wrong:** A static file cannot be toggled per environment. The production deployment would also disallow crawlers unless the file is environment-specific, which requires build-time file swapping.
**Do this instead:** Use `src/app/robots.ts` with the environment variable gate. One file, environment-aware behavior.

### Anti-Pattern 2: Rendering the Banner Only in the Reader Layout

**What people do:** Add TestBanner to `(public)/layout.tsx` only, assuming editors will know the site is in test mode.
**Why it's wrong:** The admin CMS also operates on the test deployment. Editors reviewing content on the test site should see the banner too, avoiding confusion about whether they are on production.
**Do this instead:** Add the banner to the root `layout.tsx` so it appears on every route — reader and admin — with one insertion point.

### Anti-Pattern 3: Hardcoding the Banner Style in Tailwind Without a Fixed Z-Index

**What people do:** Style the banner with layout flow (not `fixed`), allowing it to scroll off screen.
**Why it's wrong:** The banner must always be visible to communicate test status. If it scrolls away, reviewers sharing deep-link URLs see no indicator.
**Do this instead:** Use `position: fixed; top: 0; z-index: 9999` (inline style or Tailwind `fixed top-0 z-[9999]`). Offset the body or first layout element by the banner height to prevent content overlap.

### Anti-Pattern 4: Using NEXT_PUBLIC_ Prefix on Secrets

**What people do:** Set `NEXT_PUBLIC_TEST_MODE=true` next to secret keys in the same .env, then accidentally expose the pattern.
**Why it's wrong:** `NEXT_PUBLIC_` variables are inlined into the client bundle. This is intentional for TEST_MODE but must never be used for secrets (DATABASE_URL, ADMIN_SESSION_SECRET, API keys).
**Do this instead:** Keep the convention clear: `NEXT_PUBLIC_` only for values safe to expose. All secrets remain without the prefix. TEST_MODE is safe to expose — it is not sensitive.

---

## Scaling Considerations

This milestone has no scaling implications. The changes are:
- One env var check (zero runtime cost)
- One small Server Component (renders null in production, no client bundle)
- One dynamic route handler generating ~50 bytes of text

These features add no database load, no new API calls, and no meaningful rendering overhead at any scale.

---

## Sources

- Next.js 15 official docs, `generateMetadata` — robots field: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#robots (verified 2026-03-26, docs version 16.2.1)
- Next.js 15 official docs, `robots.ts` file convention: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots (verified 2026-03-26, docs version 16.2.1)
- Existing codebase inspection: `src/app/layout.tsx`, `src/app/(public)/layout.tsx`, `src/app/(admin)/layout.tsx`, `bundesland.config.ts`, `src/app/sitemap.ts`

---

## Full Platform Architecture (v1.0 Reference)

The section below is the original architecture research from v1.0. Preserved for reference. All v1.2 additions are additive and do not change this baseline.

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ OTS.at API │  │  RSS Feed  │  │  RSS Feed  │  │ Future API │  │
│  │  Adapter   │  │ Adapter A  │  │ Adapter B  │  │  Adapter N │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  │
│        └───────────────┴───────────────┴───────────────┘         │
│                              │                                    │
│                    ┌─────────▼──────────┐                         │
│                    │  Ingestion Queue   │  (dedup + normalize)    │
│                    └─────────┬──────────┘                         │
├──────────────────────────────┼───────────────────────────────────┤
│                     AI PROCESSING LAYER                           │
├──────────────────────────────┼───────────────────────────────────┤
│                    ┌─────────▼──────────┐                         │
│                    │   AI Pipeline      │                         │
│                    │ ┌────────────────┐ │                         │
│                    │ │ Bezirk Tagger  │ │  (classify by region)  │
│                    │ ├────────────────┤ │                         │
│                    │ │ Article Writer │ │  (LLM rewrite/expand)  │
│                    │ └────────────────┘ │                         │
│                    └─────────┬──────────┘                         │
├──────────────────────────────┼───────────────────────────────────┤
│                        CONTENT STORE                              │
├──────────────────────────────┼───────────────────────────────────┤
│  ┌──────────────────┐        │        ┌─────────────────────────┐ │
│  │  Articles DB     │◄───────┘        │   Source Raw Cache      │ │
│  │  (with Bezirk    │                 │   (deduplicate check)   │ │
│  │   associations)  │                 └─────────────────────────┘ │
│  └────────┬─────────┘                                             │
├───────────┼──────────────────────────────────────────────────────┤
│           │              DELIVERY LAYER                           │
├───────────┼──────────────────────────────────────────────────────┤
│  ┌────────▼─────────┐           ┌──────────────────────────────┐  │
│  │  Editorial CMS   │           │     Reader Frontend           │  │
│  │  (admin UI)      │           │  (Mein Bezirk / public site) │  │
│  └──────────────────┘           └──────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────┐                                              │
│  │  Scheduler       │  (cron / job runner for pipeline triggers)  │
│  └──────────────────┘                                              │
└──────────────────────────────────────────────────────────────────┘
```

*Full v1.0 architecture details documented on 2026-03-21. See git history for original file.*

---
*Architecture research for: v1.2 Test Deployment — Regionalprojekt / Ennstal Aktuell*
*Researched: 2026-03-26*
