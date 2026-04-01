---
phase: 35-homepage-feature-components
verified: 2026-04-01T22:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 35: Homepage Feature Components — Verification Report

**Phase Goal:** Build homepage feature components — Grune der Woche section, weather widget, Frag den Wurzelmann card, MascotGreeting restyle, HeroArticle CTA, and wire everything into HomepageLayout with Archivist tonal backgrounds.
**Verified:** 2026-04-01T22:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Article model has a nullable theme field in the database | VERIFIED | `prisma/schema.prisma` line 75: `theme  String?`; `@@index([theme])` at line 90; migration SQL at `prisma/migrations/20260401_add_article_theme/migration.sql` adds `ALTER TABLE "Article" ADD COLUMN "theme" TEXT` |
| 2  | `listGrueneWocheArticles()` returns only PUBLISHED articles with theme='gruene_woche' | VERIFIED | `src/lib/content/articles.ts` line 464: `where: { status: 'PUBLISHED', theme: 'gruene_woche' }`, ordered `publishedAt: 'desc'`, takes `limit` (default 10); 4 TDD tests in `articles.test.ts` cover filter, empty result, ordering, and limit |
| 3  | CMS article edit page has a theme dropdown that persists to the database | VERIFIED | `src/app/(admin)/admin/articles/[id]/edit/page.tsx` extracts `formData.get('theme')`, maps empty string to null, and calls `updateArticle({ theme: ... })`; `UpdateArticleInput` has `theme?: string | null`; `updateArticleDb` normalises empty string to null before `prisma.article.update()` |
| 4  | GrueneWocheSection component renders themed articles when they exist | VERIFIED | `src/components/reader/GrueneWocheSection.tsx` — exports `GrueneWocheSection`, renders featured article via `RegionalEditorialCard` and up to 3 list articles via `ListItem`; returns null when articles array is empty |
| 5  | The Topmeldung hero displays a VOLLSTAENDIGEN ARTIKEL LESEN CTA span above the gradient | VERIFIED | `src/components/reader/HeroArticle.tsx` line 61-63: `<span>` with `VOLLSTAENDIGEN ARTIKEL LESEN`; placed after excerpt block inside the content zone |
| 6  | MascotGreeting renders as a flat tonal Wurzel sagt box with no speech bubble tail and no avatar image | VERIFIED | `src/components/reader/MascotGreeting.tsx` — no `Image` import, no speech bubble markup; renders `<div className="bg-surface rounded-xs px-4 py-3">` with "Wurzel sagt ..." label |
| 7  | Frag den Wurzelmann card dispatches openBezirkModal on click | VERIFIED | `src/components/reader/FragDenWurzelmannCard.tsx` line 7: `onClick={() => window.dispatchEvent(new Event('openBezirkModal'))}` |
| 8  | Weather widget fetches temperature and condition from Open-Meteo via server-side API route with 30-minute cache | VERIFIED | `src/app/api/reader/weather/route.ts` uses `unstable_cache` with `revalidate: 1800` (30 min), key `['weather', slug]` per bezirk; fetches `api.open-meteo.com`; `WeatherWidget` fetches `/api/reader/weather?bezirk=...`, gates on `mounted` state to prevent hydration mismatch |
| 9  | All new components wired into HomepageLayout with Archivist tonal section alternation | VERIFIED | `HomepageLayout.tsx` imports and renders `WeatherWidget`, `FragDenWurzelmannCard`, `GrueneWocheSection`; section order: Hero (no-bg) > bg-surface (MascotGreeting) > bg-parchment (TopMeldungenRow) > bg-ink (Weather + Wurzelmann) > bg-surface (Ad) > bg-parchment/bg-surface alternating (editorial) > bg-surface (GrueneWocheSection); `page.tsx` fetches `listGrueneWocheArticles({ limit: 10 })` and passes result as prop |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `prisma/schema.prisma` | 01 | VERIFIED | `theme  String?` at line 75; `@@index([theme])` at line 90 |
| `prisma/migrations/20260401_add_article_theme/migration.sql` | 01 | VERIFIED | EXISTS; adds `"theme" TEXT` column and `Article_theme_idx` index |
| `src/lib/content/articles.ts` | 01 | VERIFIED | Exports `listGrueneWocheArticles` (overloaded, injectable PrismaClient); line 464 filter verified |
| `src/lib/content/articles.test.ts` | 01 | VERIFIED | `listGrueneWocheArticles` describe block with 4 tests: filter, empty array, order DESC, limit |
| `src/lib/admin/articles-actions.ts` | 01 | VERIFIED | `UpdateArticleInput` has `theme?: string | null`; `updateArticleDb` normalises and persists theme |
| `src/app/(admin)/admin/articles/[id]/edit/page.tsx` | 01 | VERIFIED | Theme select field with options "Kein Thema" and "Gruenes der Woche"; server action extracts and passes theme |
| `src/components/reader/GrueneWocheSection.tsx` | 01 | VERIFIED | Exports `GrueneWocheSection`; substantive: RegionalEditorialCard + ListItem rendering; wired into HomepageLayout |
| `src/components/reader/HeroArticle.tsx` | 02 | VERIFIED | Contains `VOLLSTAENDIGEN ARTIKEL LESEN` CTA span; wired via HomepageLayout existing usage |
| `src/components/reader/MascotGreeting.tsx` | 02 | VERIFIED | No Image import, no speech bubble; flat tonal bg-surface box with "Wurzel sagt ..."; wired via HomepageLayout |
| `src/components/reader/FragDenWurzelmannCard.tsx` | 02 | VERIFIED | Exports `FragDenWurzelmannCard`; dispatches `openBezirkModal`; wired in HomepageLayout bg-ink zone |
| `bundesland.config.ts` | 03 | VERIFIED | Exports `BEZIRK_COORDS` with exactly 13 Steiermark Bezirk entries after default export |
| `src/app/api/reader/weather/route.ts` | 03 | VERIFIED | Exports `GET`; `unstable_cache` with `revalidate: 1800`; per-bezirk cache key `['weather', slug]` |
| `src/components/reader/WeatherWidget.tsx` | 03 | VERIFIED | Exports `WeatherWidget`; `mounted` gate prevents hydration mismatch; fetches `/api/reader/weather`; wired in HomepageLayout |
| `src/components/reader/HomepageLayout.tsx` | 03 | VERIFIED | All three new components imported and rendered; `grueneWocheArticles` prop added; 7-zone tonal alternation |
| `src/app/(public)/page.tsx` | 03 | VERIFIED | `listGrueneWocheArticles` imported and called in `Promise.all`; result passed as `grueneWocheArticles` prop |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/content/articles.ts` | `prisma.article` | `findMany with theme filter` | WIRED | Line 463-468: `db.article.findMany({ where: { status: 'PUBLISHED', theme: 'gruene_woche' }, ... })` |
| `src/app/(admin)/admin/articles/[id]/edit/page.tsx` | `src/lib/admin/articles-actions.ts` | `updateArticle server action with theme` | WIRED | Line 16-24 extracts `theme` from FormData and passes to `updateArticle()` |
| `src/components/reader/FragDenWurzelmannCard.tsx` | `BezirkModal` | `window.dispatchEvent(new Event('openBezirkModal'))` | WIRED | Line 7: exact event dispatch pattern matches BezirkModal listener |
| `src/components/reader/WeatherWidget.tsx` | `/api/reader/weather` | `fetch on client mount after reading localStorage bezirk` | WIRED | Line 31: `fetch('/api/reader/weather?bezirk=${encodeURIComponent(slug)}')` inside `useEffect` after reading `localStorage.getItem("bezirk_selection")` |
| `src/app/api/reader/weather/route.ts` | `api.open-meteo.com` | `unstable_cache wrapped fetch` | WIRED | Line 10-19: `unstable_cache` wraps Open-Meteo fetch; `revalidate: 1800`; key `['weather', slug]` |
| `src/app/(public)/page.tsx` | `src/lib/content/articles.ts` | `listGrueneWocheArticles() call` | WIRED | Line 5: import; line 15: `listGrueneWocheArticles({ limit: 10 })` in `Promise.all` |
| `src/components/reader/HomepageLayout.tsx` | `GrueneWocheSection, WeatherWidget, FragDenWurzelmannCard` | `import and render in layout` | WIRED | Lines 13-15: all three imported; lines 122-127 (Weather+Wurzelmann zone), lines 223-228 (GrueneWocheSection zone) |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HOME-01 | 35-02 | Topmeldung hero includes "VOLLSTANDIGEN ARTIKEL LESEN" CTA with gradient overlay | SATISFIED | `HeroArticle.tsx` line 61: `<span>VOLLSTAENDIGEN ARTIKEL LESEN</span>` inside content zone div |
| HOME-02 | 35-02 | MascotGreeting restyled as "Wurzel sagt..." tonal box (not speech bubble) | SATISFIED | `MascotGreeting.tsx` — flat `bg-surface` box, "Wurzel sagt ...", no Image import, no bubble |
| HOME-03 | 35-03 | Weather widget displays current temperature and conditions for user's selected Bezirk via Open-Meteo API | SATISFIED | WeatherWidget + /api/reader/weather route; BEZIRK_COORDS with 13 entries; 30-min cache |
| HOME-04 | 35-02 | "Frag den Wurzelmann" card with dark green background links to region selector | SATISFIED | `FragDenWurzelmannCard.tsx` — button dispatches `openBezirkModal`; wrapped in `bg-ink` zone by HomepageLayout |
| HOME-05 | 35-01 | "Das Grune der Woche" themed section displays nature/environment-tagged articles | SATISFIED | `GrueneWocheSection.tsx` renders themed articles; `listGrueneWocheArticles` queries `theme='gruene_woche'`; CMS dropdown sets theme |
| HOME-06 | 35-03 | Homepage sections use tonal background alternation per the Archivist palette | SATISFIED | HomepageLayout: no-bg > bg-surface > bg-parchment > bg-ink > bg-surface > bg-parchment/bg-surface > bg-surface |

All 6 requirements marked Complete in REQUIREMENTS.md. No orphaned requirements detected.

---

## Anti-Patterns Found

No anti-patterns found across all phase 35 modified files. No TODO/FIXME/PLACEHOLDER comments, no stub implementations, no empty return values.

---

## Human Verification Required

### 1. Weather widget live render

**Test:** Open the homepage in a browser with a Bezirk selected in localStorage (key `bezirk_selection`, value e.g. `["graz"]`). Wait for the page to load client-side.
**Expected:** Temperature in Celsius and WMO condition label appear in the dark bg-ink zone. The bezirk display name appears below.
**Why human:** Requires a running Next.js dev server with a live Open-Meteo HTTP response; cannot verify network fetch programmatically.

### 2. Tonal section visual order

**Test:** Load the homepage in a browser (no bezirk selected, then with bezirk selected).
**Expected:** Sections visually alternate — off-white (surface) > cream (parchment) > dark ink — with no two adjacent sections having the same background tone.
**Why human:** Visual appearance of CSS tokens requires visual inspection; computed color values cannot be confirmed from source alone.

### 3. CMS theme persistence end-to-end

**Test:** Open an article in the admin CMS, select "Gruenes der Woche" in the Thema dropdown, save, reopen the article.
**Expected:** The theme dropdown shows "Gruenes der Woche" on reopen; the article appears in the GrueneWocheSection on the homepage (after publishing).
**Why human:** Requires a running app with a connected database.

---

## Gaps Summary

None. All must-haves from all three plans are fully satisfied.

---

## Commits Verified

| Hash | Description |
|------|-------------|
| `6ccec50` | feat(35-01): Prisma migration + listGrueneWocheArticles DAL |
| `04b0611` | feat(35-01): CMS theme field + GrueneWocheSection component |
| `cda0da2` | feat(35-02): HeroArticle CTA + MascotGreeting tonal restyle |
| `8467b3e` | feat(35-02): add FragDenWurzelmannCard component |
| `f1a2e99` | feat(35-03): add BEZIRK_COORDS, weather API route, and WeatherWidget |
| `900d19c` | feat(35-03): wire WeatherWidget, FragDenWurzelmannCard, GrueneWocheSection into HomepageLayout |

All 6 commits confirmed in git log.

---

_Verified: 2026-04-01T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
