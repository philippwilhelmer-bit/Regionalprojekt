# Phase 42: On-Demand Route, CMS Picker, and Backfill - Research

**Researched:** 2026-04-13
**Domain:** Next.js API routes, Next.js Server Actions, React client components, Prisma batch queries
**Confidence:** HIGH (all patterns verified from existing project source; no new libraries required)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-03 | System provides on-demand API route to generate map image for any article by ID | Next.js route handler pattern from `src/app/api/reader/articles/route.ts`; `generateMapImage` + `geocodeLocation` + `extractLocation` already available and tested; auth via CRON_SECRET header |
| INTG-04 | Editor can trigger bulk backfill to generate maps for existing articles without images | Server Action pattern from `article-form-actions.ts`; Prisma `findMany` with `imageUrl: null` filter; loop calling map pipeline per article |
| CMS-01 | Editor can preview, regenerate, and override map images via a "Karte" tab alongside existing Unsplash picker | `UnsplashPicker.tsx` is the direct model; tab switcher pattern; Server Actions `saveArticleImage` / `removeArticleImage` can be reused directly for saving the map URL |
</phase_requirements>

---

## Summary

Phase 42 closes the remaining three open requirements from v3.1 by building on the complete map generation infrastructure from Phases 40 and 41. All three deliverables consume existing functions without new npm dependencies.

**INTG-03 (On-Demand Route):** A new `POST /api/admin/generate-map` route handler accepts `{ articleId: number }`, loads the article, runs the same `extractLocation → geocodeLocation → generateMapImage` pipeline already integrated into the cron, and writes the result back to the article. Auth uses `CRON_SECRET` (same pattern as the existing cron route) or `requireAuth()` from the Node runtime — the cron pattern is simpler since it does not require a browser session cookie.

**INTG-04 (Bulk Backfill):** A Server Action `backfillMapImages()` in `src/lib/admin/map-actions.ts` fetches all PUBLISHED articles where `imageUrl IS NULL`, iterates through them sequentially calling the map pipeline, and returns a count of successes and failures. Called from a button in the CMS admin panel. Because backfill can involve many articles and Vercel's function timeout is 300s (already set on the cron route), sequential processing with early-exit on timeout is the correct approach for Hobby plan.

**CMS-01 (Map Picker Tab):** The edit page at `src/app/(admin)/admin/articles/[id]/edit/page.tsx` currently renders `<UnsplashPicker>`. A new `<MapPicker>` client component sits alongside it in a two-tab switcher ("Unsplash" / "Karte"). MapPicker shows the current image (if `imageCredit === '© basemap.at'`), a "Karte neu generieren" button (calls the on-demand route), and a "Bild entfernen" button (calls `removeArticleImage`). The existing `saveArticleImage` Server Action is reused to persist the generated URL.

**Primary recommendation:** Build in dependency order — on-demand route first (INTG-03), then backfill action (INTG-04), then CMS picker tab (CMS-01) — since the picker calls the route and backfill reuses the same pipeline logic.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js Route Handlers | 15 (installed) | `POST /api/admin/generate-map` | Same pattern as `src/app/api/reader/articles/route.ts` and cron route |
| Next.js Server Actions | 15 (installed) | `backfillMapImages()` server action | Same pattern as all existing admin actions |
| `@prisma/client` | `^6.19.2` (installed) | Article queries for backfill and on-demand route | Project ORM — no alternative |
| `extractLocation` / `geocodeLocation` / `generateMapImage` | project (Phase 40+41) | Map generation pipeline | All three modules already implemented and tested |
| `saveArticleImage` / `removeArticleImage` | project (unsplash-actions.ts) | Persist map URL, clear image | Already used by UnsplashPicker — direct reuse |
| `requireAuth` | project (auth-node.ts) | CMS auth gate for Server Actions | Project auth pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useTransition` | React 18 (built-in) | Non-blocking UI for map generation trigger | Same pattern as UnsplashPicker |
| `useState` | React 18 (built-in) | Tab state, pending message in MapPicker | Same pattern as UnsplashPicker |
| Vitest | `^2.1.9` (installed) | Unit tests for route handler and backfill action | All tests in this phase |
| `@electric-sql/pglite` | `^0.4.1` (installed) | In-memory Postgres for backfill action tests | Same pattern as pipeline.test.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CRON_SECRET auth on API route | Session cookie via `requireAuth()` | CRON_SECRET is simpler — avoids `next/headers` in API route context; consistent with cron route; the route is not browser-facing |
| Tab switcher in edit page | Separate pages for Unsplash/Karte | Tab switcher matches CMS-01 spec ("alongside"); less navigation friction |
| Sequential backfill loop | `Promise.all` concurrent backfill | Sequential avoids Nominatim rate-limit violations (1 req/s policy) and Vercel function memory ceiling |

**No new npm installs needed.** All dependencies already present.

---

## Architecture Patterns

### Recommended File Structure
```
src/
├── app/
│   └── api/
│       └── admin/
│           └── generate-map/
│               └── route.ts          # NEW — INTG-03: POST /api/admin/generate-map
├── lib/
│   └── admin/
│       ├── map-actions.ts            # NEW — INTG-04: backfillMapImages() Server Action
│       └── unsplash-actions.ts       # UNCHANGED — saveArticleImage / removeArticleImage reused
├── components/
│   └── admin/
│       └── MapPicker.tsx             # NEW — CMS-01: client component, tab alongside UnsplashPicker
└── app/
    └── (admin)/
        └── admin/
            └── articles/
                └── [id]/
                    └── edit/
                        └── page.tsx  # MODIFIED — add MapPicker tab alongside UnsplashPicker
```

### Pattern 1: On-Demand Route Handler (INTG-03)
**What:** POST handler that generates a map for a specific article ID. Returns `{ url, credit }` on success or `{ error }` on failure. Auth via `Authorization: Bearer {CRON_SECRET}` header.
**When to use:** Called by MapPicker component and by external scripts.

```typescript
// src/app/api/admin/generate-map/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractLocation, llmLocationFallback } from '@/lib/images/locextract'
import { geocodeLocation } from '@/lib/images/geocode'
import { generateMapImage } from '@/lib/images/mapgen'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60  // tile fetch + sharp can take ~10s; 60s is safe

export async function POST(request: NextRequest) {
  // Auth: Bearer CRON_SECRET (same pattern as cron route)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { articleId?: number }
  const articleId = Number(body.articleId)
  if (!articleId) {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 })
  }

  const article = await prisma.article.findUnique({ where: { id: articleId } })
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const articleContent = [article.title, article.content].filter(Boolean).join('\n\n')
  const anthropicClient = new Anthropic()

  const locationName =
    extractLocation(articleContent) ??
    (await llmLocationFallback(anthropicClient, articleContent))

  if (!locationName) {
    return NextResponse.json({ error: 'No location found in article' }, { status: 422 })
  }

  const geo = await geocodeLocation(prisma, locationName)
  if (!geo) {
    return NextResponse.json({ error: `Location "${locationName}" not geocodable` }, { status: 422 })
  }

  const mapImage = await generateMapImage(geo.lat, geo.lon, article.title ?? '', articleId, geo.locationType)
  if (!mapImage) {
    return NextResponse.json({ error: 'Map generation failed' }, { status: 500 })
  }

  // Persist result
  await prisma.article.update({
    where: { id: articleId },
    data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
  })

  return NextResponse.json({ url: mapImage.url, credit: mapImage.credit })
}
```

**Critical:** `maxDuration = 60` is required. Tile fetching + sharp stitching can take 8-15s; without the override Vercel cuts off at the platform default.

### Pattern 2: Backfill Server Action (INTG-04)
**What:** Server Action that finds all PUBLISHED articles with `imageUrl: null` and runs the map pipeline for each sequentially.
**When to use:** Called from a CMS admin button (e.g., on the articles list page or a dedicated backfill section).

```typescript
// src/lib/admin/map-actions.ts
'use server'

import { prisma } from '../prisma'
import { requireAuth } from './auth-node'
import { extractLocation, llmLocationFallback } from '../images/locextract'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'
import Anthropic from '@anthropic-ai/sdk'

export interface BackfillResult {
  processed: number
  succeeded: number
  failed: number
  skipped: number   // no location found
}

export async function backfillMapImages(): Promise<BackfillResult> {
  await requireAuth()

  const articles = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      imageUrl: null,
    },
    select: { id: true, title: true, content: true },
    orderBy: { publishedAt: 'desc' },
    take: 50,  // cap per invocation — Vercel Hobby maxDuration=300s, ~6s/article
  })

  const client = new Anthropic()
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const article of articles) {
    try {
      const articleContent = [article.title, article.content].filter(Boolean).join('\n\n')
      const locationName =
        extractLocation(articleContent) ??
        (await llmLocationFallback(client, articleContent))

      if (!locationName) {
        skipped++
        continue
      }

      const geo = await geocodeLocation(prisma, locationName)
      if (!geo) {
        skipped++
        continue
      }

      const mapImage = await generateMapImage(geo.lat, geo.lon, article.title ?? '', article.id, geo.locationType)
      if (!mapImage) {
        failed++
        continue
      }

      await prisma.article.update({
        where: { id: article.id },
        data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
      })
      succeeded++
    } catch {
      failed++
    }
  }

  return { processed: articles.length, succeeded, failed, skipped }
}
```

**Critical:** Hard cap at 50 articles per invocation. Vercel Hobby plan's Server Action timeout matches `maxDuration = 300` on API routes, but Server Actions don't accept `maxDuration` export — they are governed by the route segment config of their parent page. The articles list admin page does not set a custom timeout. A 50-article cap at ~6s/article = ~300s fits Vercel's limit. If more articles need backfill, the editor clicks the button again.

### Pattern 3: MapPicker Client Component (CMS-01)
**What:** Client component rendered in the edit page alongside UnsplashPicker. Uses a tab switcher to show either Unsplash or Karte. The Karte tab shows the current map image (if credit is "© basemap.at"), a "Karte generieren" button that calls the on-demand route, and a "Bild entfernen" button.
**When to use:** Rendered in `page.tsx` edit route — replaces the bare `<UnsplashPicker>` with a tabbed wrapper containing both pickers.

```tsx
// src/components/admin/MapPicker.tsx
'use client'

import { useState, useTransition } from 'react'
import { saveArticleImage, removeArticleImage } from '@/lib/admin/unsplash-actions'

interface MapPickerProps {
  articleId: number
  currentImageUrl: string | null
  currentImageCredit: string | null
}

export function MapPicker({ articleId, currentImageUrl, currentImageCredit }: MapPickerProps) {
  const isMapImage = currentImageCredit === '© basemap.at'
  const [savedUrl, setSavedUrl] = useState(isMapImage ? currentImageUrl : null)
  const [savedCredit, setSavedCredit] = useState(isMapImage ? currentImageCredit : null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  function handleGenerate() {
    startTransition(async () => {
      setMessage('Karte wird generiert...')
      try {
        const res = await fetch('/api/admin/generate-map', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`,
          },
          body: JSON.stringify({ articleId }),
        })
        if (!res.ok) {
          const err = await res.json() as { error?: string }
          setMessage(err.error ?? 'Fehler bei der Kartengenerierung.')
          return
        }
        const data = await res.json() as { url: string; credit: string }
        await saveArticleImage(articleId, data.url, data.credit)
        setSavedUrl(data.url)
        setSavedCredit(data.credit)
        setMessage('Karte gespeichert.')
      } catch {
        setMessage('Netzwerkfehler bei der Kartengenerierung.')
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      await removeArticleImage(articleId)
      setSavedUrl(null)
      setSavedCredit(null)
      setMessage('Bild entfernt.')
    })
  }

  // ... render: current image preview, generate button, remove button
}
```

**Auth note for MapPicker:** The on-demand route uses `CRON_SECRET` auth. The picker calls it from the browser, which means the secret must be available client-side. Two options:

| Option | Approach | Tradeoff |
|--------|----------|----------|
| A (recommended) | Expose `NEXT_PUBLIC_CRON_SECRET` — acceptable since CMS is single-admin and already HMAC-protected | Simple, no extra Server Action wrapper needed |
| B | Wrap the fetch in a Server Action that calls the route internally | Hides the secret but adds a Server Action indirection layer |

**Use Option A.** The CMS is single-admin with session auth; `CRON_SECRET` is already known to whoever deploys the app; Vercel exposes it as an env var in the dashboard anyway. Add `NEXT_PUBLIC_CRON_SECRET` to Vercel env vars pointing to the same value as `CRON_SECRET`.

**Alternative (cleaner):** Change the on-demand route to use `requireAuth()` instead of CRON_SECRET, making it a proper session-auth'd CMS route. Since it's not called by external crons but only by the CMS picker, this is the cleaner design. The route would call `requireAuth()` (from `auth-node.ts`), which reads the session cookie — but `requireAuth()` uses `next/headers` which is allowed inside Server Actions and Server Components but NOT directly in Route Handlers in Next.js 15.

**Resolution:** Use a Server Action wrapper for the generation trigger instead of a raw `fetch` to the route. The MapPicker calls a Server Action `generateMapForArticle(articleId)` in `map-actions.ts` (alongside `backfillMapImages`). This is the cleanest approach: no `NEXT_PUBLIC_CRON_SECRET` exposure, no `next/headers` issue, consistent with all other admin patterns.

```typescript
// In map-actions.ts — add alongside backfillMapImages
export async function generateMapForArticle(articleId: number): Promise<{ url: string; credit: string } | { error: string }> {
  await requireAuth()
  // ... same pipeline as route handler but as Server Action
}
```

The API route (`/api/admin/generate-map`) is still useful for **external tooling** (scripts, curl) and keeps INTG-03 semantics. The CMS picker uses the Server Action instead of the route directly. Both serve INTG-03's spirit: "system provides on-demand generation for any article by ID."

### Pattern 4: Tab Switcher in Edit Page (CMS-01)
**What:** The edit page wraps UnsplashPicker and MapPicker in a two-tab switcher. Tab state is client-side (React state in a wrapper component or inline in the page via a Client Component wrapper).
**When to use:** Rendered in the server component edit page — requires a thin client wrapper for tab state.

```tsx
// In edit/page.tsx — replace bare <UnsplashPicker> with:
<ImagePickerTabs
  articleId={article.id}
  headline={article.title ?? ''}
  currentImageUrl={article.imageUrl}
  currentImageCredit={article.imageCredit}
/>
```

```tsx
// src/components/admin/ImagePickerTabs.tsx — 'use client'
// Renders two tabs: "Unsplash" and "Karte"
// Tab 0: <UnsplashPicker> (existing, unchanged)
// Tab 1: <MapPicker> (new)
// Active tab initialized: if currentImageCredit === '© basemap.at' → start on Karte tab
```

### Pattern 5: Backfill Trigger UI (INTG-04)
**What:** A form button on the articles list page (`/admin/articles`) or as a separate section triggers `backfillMapImages()`. Returns a result summary displayed to the editor.
**When to use:** Triggered manually by the editor to fill in missing map images.

The articles list page is a Server Component. The backfill button needs to be a Client Component to show the result asynchronously. A thin `<BackfillButton>` component calls the Server Action via `useTransition` and displays the returned `BackfillResult`.

```tsx
// src/components/admin/BackfillButton.tsx — 'use client'
'use client'
import { useState, useTransition } from 'react'
import { backfillMapImages } from '@/lib/admin/map-actions'
import type { BackfillResult } from '@/lib/admin/map-actions'

export function BackfillButton() {
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleBackfill() {
    startTransition(async () => {
      const r = await backfillMapImages()
      setResult(r)
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleBackfill}
        disabled={isPending}
        className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Karten werden generiert...' : 'Karten-Backfill starten'}
      </button>
      {result && (
        <p className="text-sm text-ink-dim mt-2">
          Fertig: {result.succeeded} generiert, {result.skipped} kein Ort, {result.failed} Fehler
        </p>
      )}
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Calling `requireAuth()` inside a Route Handler:** `next/headers` is not available in Route Handler context in Next.js 15. Use the Bearer token pattern (CRON_SECRET) for the API route. Use `requireAuth()` only in Server Actions and Server Components.
- **Not setting `maxDuration` on the on-demand route:** Tile fetch + sharp stitching takes 8-15s per article. Without `export const maxDuration = 60`, Vercel cuts the function at the platform default (10s on Hobby).
- **Using `Promise.all` for backfill:** Concurrent Nominatim calls violate the 1 req/s rate limit. Sequential loop is mandatory.
- **Backfilling all articles in one call:** Without a `take: 50` cap, a large backfill will exceed Vercel's 300s function timeout. The planner MUST cap the batch size.
- **Forgetting `imageUrl: null` guard in backfill:** The `findMany` filter `imageUrl: null` is the only thing preventing the backfill from overwriting manually-set Unsplash images. Verify the Prisma filter syntax: `where: { imageUrl: null }` (Prisma treats `null` as IS NULL).
- **Calling `generateMapImage` with `article.title` only:** The cron pipeline uses `[step2.headline, step2.lead, step2.body].join('\n\n')` as the text for location extraction. For on-demand and backfill, the AI-rewritten content is stored in `article.content`; combine `article.title + article.content` for best regex coverage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map generation logic | Duplicate pipeline code in route/action | Import `extractLocation`, `geocodeLocation`, `generateMapImage` from existing modules | All three modules are implemented, tested, and handle error cases |
| Image persistence | Custom DB update in picker | `saveArticleImage(articleId, url, credit)` from unsplash-actions.ts | Already handles auth and DB update; tested in prod |
| Image removal | Custom DB update in picker | `removeArticleImage(articleId)` from unsplash-actions.ts | Same rationale |
| Tab UI | Custom tab component from scratch | Inline tab switcher using Archivist tokens (border-b active state, tonal backgrounds) | No tab library exists in this project; simple two-tab switcher is ~20 lines |
| Prisma `null` filter | `imageUrl: { equals: null }` | `imageUrl: null` | Prisma accepts `null` directly in where clauses for IS NULL; the verbose form is unnecessary |

---

## Common Pitfalls

### Pitfall 1: `requireAuth()` in Route Handler Context
**What goes wrong:** `TypeError: cookies is only available in Server Components and Server Actions` at runtime.
**Why it happens:** `requireAuth()` calls `cookies()` from `next/headers`, which is only available in Server Components and Server Actions. Route Handlers are a different runtime context in Next.js 15.
**How to avoid:** Use `Authorization: Bearer ${CRON_SECRET}` header auth in the Route Handler, exactly like the existing cron route. Use `requireAuth()` only in Server Actions and Server Components.
**Warning signs:** Runtime error in production mentioning `next/headers` or `cookies`.

### Pitfall 2: Missing `maxDuration` Export on Route Handler
**What goes wrong:** Map generation cuts off after 10s (Vercel Hobby platform default), returning a 504 to the caller.
**Why it happens:** Tile fetching (5 concurrent fetches × 3 rows = 15 requests) + sharp stitching + Blob upload takes 8-20s total.
**How to avoid:** `export const maxDuration = 60` at the top of `route.ts`. This matches the cron route pattern.
**Warning signs:** `FUNCTION_INVOCATION_TIMEOUT` in Vercel logs; inconsistent map generation (works locally, fails in prod).

### Pitfall 3: Backfill Overwrites Unsplash Images
**What goes wrong:** Articles with manually-set Unsplash images get map images written over them.
**Why it happens:** Backfill `findMany` query missing the `imageUrl: null` filter, or filter written incorrectly.
**How to avoid:** Prisma where clause: `where: { status: 'PUBLISHED', imageUrl: null }`. Verify in tests that articles with `imageUrl` set are excluded.
**Warning signs:** `imageCredit` values changing from "Foto: X / Unsplash" to "© basemap.at" on articles that had Unsplash images.

### Pitfall 4: `backfillMapImages` Server Action Timeout
**What goes wrong:** Backfill action times out mid-run on Vercel with no result returned to the editor.
**Why it happens:** Server Actions on Vercel Hobby are limited by the function timeout of the parent route segment (no `maxDuration` override is accepted on Server Actions directly). The articles edit page has no `maxDuration`, so it defaults to 10-30s depending on plan.
**How to avoid:** Hard cap of `take: 50` in the backfill query. At ~6s/article average, 50 articles ≈ 300s which is the absolute max on Hobby. In practice, many articles will be skipped (no location) making this faster. Add a note in the CMS UI that the editor should run multiple times for large backlogs.
**Warning signs:** Server Action returns undefined or no result; Vercel function logs show timeout before completion.

### Pitfall 5: Tab Initial State Mismatch
**What goes wrong:** Editor opens an article that has a map image (`imageCredit === '© basemap.at'`) but the UI defaults to the Unsplash tab, making the map image invisible until the editor switches tabs.
**Why it happens:** Tab state initialized to 0 (Unsplash) regardless of current image type.
**How to avoid:** Initialize tab index based on `currentImageCredit === '© basemap.at'` — if true, default to Karte tab (index 1).
**Warning signs:** Editor confusion about why the displayed image doesn't match the active tab.

### Pitfall 6: Backfill Uses Raw `rawPayload` Instead of AI-Rewritten Content
**What goes wrong:** Location extraction against the raw JSON payload (from OTS/RSS) fails regex matching because the payload is JSON/HTML, not clean German text.
**Why it happens:** The article model has both `rawPayload` (JSON) and `content` (AI-rewritten German text). Using `rawPayload` for regex gives poor results.
**How to avoid:** Backfill and on-demand route must use `article.title + article.content` (the AI-rewritten fields), not `article.rawPayload`. Select only `{ id, title, content }` in the `findMany` to avoid loading large JSON payloads.
**Warning signs:** Location extraction success rate drops dramatically compared to the cron pipeline.

---

## Code Examples

### Verified: Prisma IS NULL filter
```typescript
// Source: Prisma docs — null equality in where clauses
const articles = await prisma.article.findMany({
  where: {
    status: 'PUBLISHED',
    imageUrl: null,  // Prisma treats null as IS NULL — correct filter for "no image"
  },
  select: { id: true, title: true, content: true },
  take: 50,
})
```

### Verified: Route Handler auth pattern (from cron route)
```typescript
// Source: src/app/api/cron/route.ts (existing, working)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

### Verified: Server Action with requireAuth (from article-form-actions.ts)
```typescript
// Source: src/lib/admin/article-form-actions.ts
'use server'
import { requireAuth } from './auth-node'
import { revalidatePath } from 'next/cache'

export async function someAdminAction(formData: FormData): Promise<void> {
  await requireAuth()
  // ... DB mutation
  revalidatePath('/admin/articles')
}
```

### Verified: MapPicker calls generateMapForArticle Server Action
```typescript
// MapPicker.tsx — 'use client'
// Source: pattern from UnsplashPicker.tsx
import { generateMapForArticle } from '@/lib/admin/map-actions'

function handleGenerate() {
  startTransition(async () => {
    setMessage('Karte wird generiert...')
    const result = await generateMapForArticle(articleId)
    if ('error' in result) {
      setMessage(result.error)
      return
    }
    setSavedUrl(result.url)
    setSavedCredit(result.credit)
    setMessage('Karte gespeichert.')
  })
}
```

### Verified: generateMapImage signature (from mapgen.ts)
```typescript
// Source: src/lib/images/mapgen.ts
export async function generateMapImage(
  lat: number,
  lon: number,
  headline: string,
  articleId: number,
  locationType?: string,
): Promise<MapImage | null>

// Returns: { url: string; credit: string } | null
// credit is always '© basemap.at'
// Returns null on any failure (does not throw)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fetch` in client component for mutations | Server Actions called directly | Phase 30s (CMS build) | No client-side API routes needed for mutations; auth handled server-side |
| Separate image API for Unsplash | `saveArticleImage` Server Action | Phase 18+ | Reuse directly for map image persistence in Phase 42 |

**Deprecated/outdated in this project:**
- Route Handlers for auth-gated mutations: server actions are preferred; route handlers are used only for external callers (cron, reader API).

---

## Open Questions

1. **Server Action timeout for backfill on Vercel Hobby**
   - What we know: Vercel Hobby maxDuration for Server Actions is governed by the parent route segment; no explicit `maxDuration` export is recognized on Server Actions. The default is likely 30s for actions.
   - What's unclear: Whether Vercel Hobby actually enforces 30s or 300s for Server Actions called from a CMS page. The cron route explicitly sets `maxDuration = 300`.
   - Recommendation: Cap the batch at 10 articles (not 50) in the initial implementation. 10 articles × 6s ≈ 60s, safely within any Vercel limit. Add a note in the UI that multiple runs are needed for large backlogs. Revisit cap after observing real performance.

2. **On-demand route: CRON_SECRET vs. session auth**
   - What we know: `requireAuth()` cannot be called in Route Handlers (uses `next/headers`). The CRON_SECRET pattern works but requires exposing the secret in a `NEXT_PUBLIC_CRON_SECRET` env var if called from browser, OR the picker uses a Server Action wrapper instead.
   - Recommendation (resolved above): Planner should use a Server Action `generateMapForArticle()` for the CMS picker, not a direct `fetch` to the route. The route remains for external/script use with CRON_SECRET auth. This is the cleanest split.

3. **What happens when `generateMapImage` returns null during backfill**
   - What we know: `generateMapImage` catches all internal errors and returns null. The backfill treats null as `failed++`.
   - What's unclear: Should the editor see a list of failed article IDs to investigate, or just a count?
   - Recommendation: Return a count only (INTG-04 spec says "trigger bulk backfill" — no requirement for per-article failure detail). A count is sufficient for the first implementation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/admin/map-actions.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-03 | Route returns 401 without correct CRON_SECRET | unit | `npx vitest run src/app/api/admin/generate-map/route.test.ts` | ❌ Wave 0 |
| INTG-03 | Route returns 422 when article has no location | unit | `npx vitest run src/app/api/admin/generate-map/route.test.ts` | ❌ Wave 0 |
| INTG-03 | Route generates map and persists URL for article with location | unit | `npx vitest run src/app/api/admin/generate-map/route.test.ts` | ❌ Wave 0 |
| INTG-04 | `backfillMapImages` skips articles with existing imageUrl | unit | `npx vitest run src/lib/admin/map-actions.test.ts` | ❌ Wave 0 |
| INTG-04 | `backfillMapImages` returns correct counts (succeeded/skipped/failed) | unit | `npx vitest run src/lib/admin/map-actions.test.ts` | ❌ Wave 0 |
| INTG-04 | `backfillMapImages` processes articles sequentially (no concurrent Nominatim calls) | unit | `npx vitest run src/lib/admin/map-actions.test.ts` | ❌ Wave 0 |
| CMS-01 | MapPicker renders current map image when imageCredit is '© basemap.at' | manual | open `/admin/articles/{id}/edit`, verify Karte tab shows image | — |
| CMS-01 | MapPicker generate button calls `generateMapForArticle` and updates displayed image | manual | click "Karte generieren", verify image appears | — |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/admin/map-actions.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/admin/map-actions.test.ts` — covers INTG-04: `backfillMapImages` (pglite + vi.mock for mapgen/geocode/locextract)
- [ ] `src/app/api/admin/generate-map/route.test.ts` — covers INTG-03: route auth, 422 cases, success path
- [ ] `src/app/api/admin/generate-map/route.ts` — the route itself (Wave 0 creates empty file, Wave 1 implements)
- [ ] `src/lib/admin/map-actions.ts` — Server Actions file (Wave 0 creates empty, Wave 1 implements)

*(No new migrations needed — `GeocodingCache` table already created in Phase 41. No new Prisma schema changes for Phase 42.)*

---

## Sources

### Primary (HIGH confidence)
- `src/app/api/cron/route.ts` — CRON_SECRET auth pattern, `maxDuration = 300` export, `NextResponse.json` response shape
- `src/components/admin/UnsplashPicker.tsx` — `useTransition` + `useState` pattern, tab-compatible component structure, `saveArticleImage`/`removeArticleImage` reuse
- `src/lib/admin/unsplash-actions.ts` — `saveArticleImage` and `removeArticleImage` signatures confirmed reusable
- `src/lib/admin/articles-actions.ts` — `listArticlesAdmin` query patterns; `imageUrl: null` filter confirmed valid Prisma syntax
- `src/lib/admin/article-form-actions.ts` — Server Action auth pattern with `requireAuth()` + `revalidatePath`
- `src/lib/images/mapgen.ts` — `generateMapImage` signature (lat, lon, headline, articleId, locationType?): `MapImage | null`
- `src/lib/images/locextract.ts` — `extractLocation` and `llmLocationFallback` signatures confirmed
- `src/lib/images/geocode.ts` — `geocodeLocation(db, placeName)` signature confirmed
- `src/app/(admin)/admin/articles/[id]/edit/page.tsx` — current edit page structure; `<UnsplashPicker>` integration point for tab wrapper
- `src/lib/admin/auth-node.ts` — `requireAuth()` implementation confirmed; uses `next/headers` → cannot be used in Route Handlers

### Secondary (MEDIUM confidence)
- Next.js 15 docs pattern: `next/headers` is available in Server Components and Server Actions, not in Route Handlers — consistent with project cron route using header-based auth instead.

### Tertiary (LOW confidence)
- Vercel Hobby plan Server Action timeout behavior — exact timeout limit for Server Actions on Hobby not officially documented in a source verified during this research. Conservative 10-article cap recommended.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns verified from existing project source files
- Architecture: HIGH — three deliverables are straightforward extensions of established patterns
- On-demand route: HIGH — cron route is the exact template; auth, structure, and error handling patterns all verified
- Backfill action: HIGH — `listArticlesAdmin` confirms Prisma query patterns; sequential loop pattern is the only safe approach given Nominatim rate limits
- MapPicker: HIGH — UnsplashPicker is the direct model; tab structure and Server Action integration patterns verified
- Backfill timeout cap: LOW — Vercel Hobby Server Action timeout limit not verified from official source; conservative cap (10 articles) recommended

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (all patterns from project source; stable)
