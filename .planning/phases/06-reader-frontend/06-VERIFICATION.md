---
phase: 06-reader-frontend
verified: 2026-03-23T14:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/10
  gaps_closed:
    - "Vitest suite is fully green (was 1 test failing due to slug strategy inconsistency)"
  gaps_remaining: []
  regressions: []
---

# Phase 6: Reader Frontend Verification Report

**Phase Goal:** Build the public-facing reader frontend — homepage with personalized Bezirk feed, article detail pages with SEO metadata, RSS feeds, sitemap, and legal pages.
**Verified:** 2026-03-23T14:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (slug strategy inconsistency fixed)

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Article schema has publicId field (stable, unique, non-sequential) | VERIFIED | prisma/schema.prisma line 55: `publicId String? @unique @default(nanoid())` with `@@index([publicId])`. Migration SQL exists at correct path. |
| 2  | German text with umlauts is correctly slugified | VERIFIED | src/lib/reader/slug.ts implements inline umlaut replacement. All 6 slug.test.ts cases green. |
| 3  | listArticlesReader returns PUBLISHED articles only, sorted pinned→featured→publishedAt desc | VERIFIED | articles.ts lines 166–183: `where: { status: 'PUBLISHED' }`, `orderBy: [{isPinned:'desc'},{isFeatured:'desc'},{publishedAt:'desc'}]`. DAL tests green. |
| 4  | Homepage shows published articles feed with BezirkModal and AdUnit hero zone | VERIFIED | src/app/(public)/page.tsx: calls `listArticlesReader({limit:20})`, renders `<AdUnit zone="hero"/>` and `<ArticleFeed/>`. BezirkModal in layout. |
| 5  | BezirkModal persists Bezirk selection to localStorage; opens on first visit and header tap | VERIFIED | BezirkModal.tsx: reads/writes `bezirk_selection` key. Auto-opens when null. Listens for `openBezirkModal` event dispatched by Header. |
| 6  | Article detail page at /artikel/[publicId]/[slug] renders full article with SEO metadata and JSON-LD | VERIFIED | Article page exists with generateMetadata, JSON-LD script, canonical redirect, source attribution, AI disclosure, ShareButton, AdUnit, related articles. |
| 7  | RSS feeds at /rss/[slug].xml return valid XML with canonical article URLs | VERIFIED | src/app/rss/[slug]/route.ts returns `Content-Type: application/rss+xml`. generateBezirkRssFeed tested (6/6 RSS tests green). 404 for unknown slug. RSS item links now use `slugify(a.title ?? '')` — consistent with canonical page URLs. |
| 8  | /sitemap.xml returns all required URLs (homepage, impressum, bezirke, articles) | VERIFIED | src/app/sitemap.ts implements MetadataRoute.Sitemap with all 4 URL categories. 6/6 sitemap tests green. Article URLs now use `slugify(a.title ?? '')` — consistent with canonical page URLs. |
| 9  | /impressum renders legally compliant page with MedienG, KI-disclosure, and Datenschutzerklärung | VERIFIED | impressum/page.tsx contains §25 MedienG, §5 ECG, KI section, DSGVO section with `id="datenschutz"` anchor. |
| 10 | Vitest suite is fully green | VERIFIED | 171/171 tests passing across 23 test files. Previously failing test (`buildArticleMetadata > canonical URL uses /artikel/[publicId]/[slug] form`) now passes — test updated to assert `regular-titel` (title-based slug), matching the title-only slug strategy applied consistently across all URL generation sites. |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | publicId on Article with @unique @default(nanoid()) | VERIFIED | Line 55 matches exactly |
| `prisma/migrations/20260323_phase6_publicid/migration.sql` | ALTER TABLE adding publicId | VERIFIED | Exists with ADD COLUMN, backfill UPDATE, and UNIQUE INDEX |
| `src/lib/reader/slug.ts` | slugify() for German URLs | VERIFIED | Exports `slugify`, 15 lines, all umlaut cases handled |
| `src/lib/content/articles.ts` | getArticleByPublicId(), listArticlesReader() | VERIFIED | Both functions exported with DI overloads |
| `src/app/(public)/layout.tsx` | Public layout wrapping all reader pages | VERIFIED | Imports Header, BottomNav, Footer, CookieBanner, BezirkModal |
| `src/components/reader/Header.tsx` | Sticky header with Bezirk indicator | VERIFIED | 'use client', reads localStorage, dispatches openBezirkModal event |
| `src/components/reader/BottomNav.tsx` | Fixed bottom navigation | VERIFIED | Server component, single Nachrichten tab, href="/" |
| `src/components/reader/Footer.tsx` | Footer with Impressum and RSS links | VERIFIED | Hardcoded 13 Bezirk slugs, all-Steiermark RSS link |
| `src/components/reader/CookieBanner.tsx` | GDPR consent banner | VERIFIED | 'use client', reads cookie_consent, sets __adsenseNpa on rejection |
| `src/components/reader/AdUnit.tsx` | AdSense ad zones | VERIFIED | 3 zones, env-var-based slot mapping, dev placeholder when PUB_ID absent, NPA mode on rejection |
| `src/app/(public)/page.tsx` | Reader homepage | VERIFIED | Server component, listArticlesReader, ArticleFeed, AdUnit hero zone |
| `src/app/(public)/bezirk/[slug]/page.tsx` | Bezirk browse page | VERIFIED | Awaits params (Next.js 15), getBezirkBySlug, notFound(), ArticleFeed |
| `src/components/reader/ArticleCard.tsx` | Article card with gradient placeholder | VERIFIED | BEZIRK_COLORS map, formatRelativeTime, pin icon, AI label, excerpt |
| `src/components/reader/ArticleFeed.tsx` | Infinite scroll feed | VERIFIED | 'use client', IntersectionObserver sentinel, fetches /api/reader/articles, AdUnit every 5 items |
| `src/components/reader/BezirkModal.tsx` | Bezirk selection modal | VERIFIED | 'use client', 13 chips, Alle Bezirke toggle, Übernehmen/Später buttons |
| `src/app/api/reader/articles/route.ts` | API route for pagination | VERIFIED | Accepts bezirkSlugs, limit, offset; resolves slugs via listBezirke |
| `src/lib/reader/metadata.ts` | buildArticleMetadata() | VERIFIED | Line 17: `slugify(article.title ?? '')` — title-only slug strategy, consistent with all other URL generation sites |
| `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` | Article detail page | VERIFIED | generateMetadata, canonical redirect, JSON-LD, social share, AdUnit, related articles. Lines 157–158: related article slugs now use `slugify(related.title ?? '')` — consistent with canonical strategy |
| `src/lib/reader/rss.ts` | generateBezirkRssFeed() | VERIFIED | Line 24: `slugify(a.title ?? '')` — title-only strategy now consistent with canonical page URLs. All 6 RSS tests green. |
| `src/app/rss/[slug]/route.ts` | RSS route handler | VERIFIED | Awaits params, .xml suffix stripping, PUBLISHED filter, 404 for unknown slug |
| `src/app/sitemap.ts` | Next.js sitemap.ts | VERIFIED | Line 36: `slugify(a.title ?? '')` — title-only strategy now consistent with canonical page URLs. All 6 sitemap tests green. |
| `src/app/(public)/impressum/page.tsx` | Impressum + Datenschutz page | VERIFIED | All required legal sections present, id="datenschutz", metadata export |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(public)/layout.tsx` | `Header.tsx`, `BottomNav.tsx`, `Footer.tsx`, `CookieBanner.tsx`, `BezirkModal.tsx` | import + render | WIRED | All 5 shell components imported and rendered |
| `src/app/layout.tsx` | `next/script` | AdSense afterInteractive | WIRED | `<Script strategy="afterInteractive">` with NEXT_PUBLIC_ADSENSE_PUB_ID |
| `src/app/(public)/page.tsx` | `src/lib/content/articles.ts` | listArticlesReader() | WIRED | Direct call `listArticlesReader({ limit: 20 })` |
| `src/components/reader/ArticleFeed.tsx` | `/api/reader/articles` | fetch with bezirkSlugs params | WIRED | IntersectionObserver triggers fetch to /api/reader/articles?bezirkSlugs=...&limit=20&offset=N |
| `src/components/reader/BezirkModal.tsx` | localStorage | reads/writes bezirk_selection | WIRED | localStorage.getItem/setItem('bezirk_selection') on mount and save |
| `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` | `src/lib/content/articles.ts` | getArticleByPublicId(publicId) | WIRED | Called on line 24 |
| `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` | `src/lib/reader/slug.ts` | slugify(article.title) | WIRED | Lines 28, 157–158 — all now use title-only |
| `generateMetadata` | `src/lib/reader/metadata.ts` | buildArticleMetadata(article, BASE_URL) | WIRED | Called in generateMetadata function |
| `src/app/rss/[slug]/route.ts` | `src/lib/reader/rss.ts` | generateBezirkRssFeed(articles, slug, BASE_URL) | WIRED | Direct call line 38 |
| `src/app/sitemap.ts` | `src/lib/content/articles.ts` | listArticles({ status: 'PUBLISHED', limit: 1000 }) | WIRED | Line 25 |
| `src/app/sitemap.ts` | `src/lib/content/bezirke.ts` | listBezirke() | WIRED | Line 26 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| READ-01 | 06-01, 06-04, 06-07 | Bezirk selection, saved locally without account | SATISFIED | BezirkModal.tsx reads/writes localStorage bezirk_selection; Header shows selection; human-verified |
| READ-02 | 06-02, 06-04, 06-07 | Homepage feed filtered to selected regions | SATISFIED | ArticleFeed fetches /api/reader/articles?bezirkSlugs= on mount; listArticlesReader filters by bezirkIds; human-verified |
| READ-03 | 06-05, 06-07 | Full article detail page with source attribution | SATISFIED | /artikel/[publicId]/[slug]/page.tsx renders title, full content, source label, AI disclosure, timestamp; human-verified |
| READ-04 | 06-03, 06-05, 06-07 | Mobile-optimized site | SATISFIED | Tailwind responsive classes throughout; sticky header, fixed bottom nav, pb-20 main; human-verified on 375x812 viewport |
| READ-05 | 06-06, 06-07 | Legally compliant Impressum page | SATISFIED | /impressum with MedienG §25, ECG §5, DSGVO, KI disclosure; human-verified |
| READ-06 | 06-06, 06-07 | Per-Bezirk subscribable RSS feeds | SATISFIED | /rss/[slug].xml route returns application/rss+xml; all 6 RSS tests green; human-verified |
| AD-01 | 06-03, 06-07 | Google AdSense with configurable placement zones | SATISFIED | AdUnit component with hero/between-articles/article-detail zones; env-var slot mapping; NPA mode; human-verified |
| SEO-01 | 06-05, 06-07 | SEO meta tags on every article page | SATISFIED | generateMetadata exports og:title, og:description, og:url, og:type='article', canonical alternate; human-verified |
| SEO-03 | 06-06, 06-07 | sitemap.xml with all article URLs | SATISFIED | src/app/sitemap.ts generates complete sitemap; all 6 sitemap tests green; human-verified |
| SEO-04 | 06-05, 06-07 | JSON-LD NewsArticle schema on article pages | SATISFIED | `<script type="application/ld+json">` with @type:NewsArticle, headline, datePublished, dateModified, author, publisher; human-verified |

All 10 required phase requirements have implementation evidence. All marked [x] (complete) in REQUIREMENTS.md.

---

### Anti-Patterns Found

No blocker or warning anti-patterns remain. All five URL generation sites (`metadata.ts`, `rss.ts`, `sitemap.ts`, article page canonical redirect, article page related article hrefs) now consistently use `slugify(title ?? '')` — the title-only slug strategy established by bug fix #7 during human verification.

---

### Human Verification Required

Human verification was completed prior to the initial automated check (Plan 07). The 06-07-SUMMARY.md confirms all 7 success criteria were approved by the human tester. No further human verification items are outstanding.

---

### Gap Closure Summary

**Gap closed: Slug strategy inconsistency + 1 failing test**

The previous gap was a partially-applied slug strategy change from bug fix #7. The fix applied the title-only strategy consistently across all five URL generation sites:

- `src/lib/reader/metadata.ts` line 17: already used `slugify(article.title ?? '')` — no change needed
- `src/lib/reader/rss.ts` line 24: changed from `slugify(a.seoTitle ?? a.title ?? '')` to `slugify(a.title ?? '')`
- `src/app/sitemap.ts` line 36: changed from `slugify(a.seoTitle ?? a.title ?? '')` to `slugify(a.title ?? '')`
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` lines 157–158: changed related article hrefs to use `slugify(related.title ?? '')`
- `src/lib/reader/metadata.test.ts` line 56: updated assertion from seoTitle-based slug to title-based slug (`regular-titel`)

Result: 171/171 tests passing, zero URL generation inconsistencies.

---

*Verified: 2026-03-23T14:00:00Z*
*Verifier: Claude (gsd-verifier)*
