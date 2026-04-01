---
phase: 36-article-detail-redesign
verified: 2026-04-01T23:14:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "Open an article with a hero image"
    expected: "Title and breadcrumb overlap the bottom of the image, gradient scrim visible behind text"
    why_human: "CSS absolute positioning and visual gradient overlay cannot be verified programmatically"
  - test: "Inspect the first paragraph of any article body"
    expected: "A large serif letter (4.5rem) floats left from the first character of the first non-blockquote paragraph"
    why_human: "CSS ::first-letter float behaviour is visual and browser-rendered"
  - test: "Open an article whose content contains a paragraph starting with > or with the German opening quote character"
    expected: "That paragraph renders with serif italic styling, tonal parchment-dim background, and top/bottom hairline borders"
    why_human: "Rendered blockquote appearance is visual"
  - test: "Widen browser to lg+ (1024px) and open any article"
    expected: "A sticky right-column sidebar appears with publisher attribution, reading time, published date, and share button; sidebar stays fixed during scroll and clears the app bar"
    why_human: "Sticky scroll behaviour and responsive breakpoint rendering are visual"
  - test: "Narrow browser below lg (< 1024px)"
    expected: "Sidebar disappears; a compact horizontal metadata strip (source, reading time, share button) appears above the article body"
    why_human: "Responsive breakpoint toggling is visual"
  - test: "Open an article WITHOUT a hero image"
    expected: "A tonal parchment-dim header block with dark ink title text — no broken empty container or missing image"
    why_human: "Visual fallback layout cannot be verified programmatically"
---

# Phase 36: Article Detail Redesign — Verification Report

**Phase Goal:** Transform the article detail page into a premium editorial layout with Archival Header, drop cap, pull quotes, sidebar metadata, and responsive design.
**Verified:** 2026-04-01T23:14:00Z
**Status:** human_needed — all automated checks pass; visual rendering needs human confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First paragraph displays float-based drop cap | VERIFIED | `drop-cap` class applied to first non-blockquote paragraph (page.tsx:204); `.drop-cap::first-letter` CSS rule at globals.css:84 with `float: left; font-size: 4.5rem` |
| 2 | Paragraphs starting with `>` or `\u201E` render as styled blockquotes | VERIFIED | `isBlockquote()` called in paragraph map (page.tsx:192); renders `<blockquote className="article-blockquote">`; `.article-blockquote` CSS rule at globals.css:95 with serif italic styling |
| 3 | Articles with hero image show title overlapping image via gradient scrim | VERIFIED | page.tsx:100–138: `<header className="relative overflow-hidden">`, `<div className="absolute inset-0 bg-gradient-to-t from-black/80...">`, `<div className="absolute bottom-0 left-0 right-0 ... z-10">` containing h1 |
| 4 | Articles without hero image show title in tonal parchment-dim header block | VERIFIED | page.tsx:146–173: `<header className="bg-parchment-dim ...">` with `text-ink` h1 |
| 5 | Desktop (lg+) shows sticky sidebar with metadata and share button | VERIFIED | ArticleSidebar.tsx: `<aside className="sticky top-[4rem]">` with publisherName, sourceLabel, readingTime, publishedAt, ShareButton; wired via `<div className="hidden lg:block"><ArticleSidebar .../>` (page.tsx:224–233) |
| 6 | Mobile shows horizontal metadata strip above article body | VERIFIED | page.tsx:183–187: `<div className="lg:hidden flex items-center flex-wrap ...">` with sourceLabel, readingTime, ShareButton |
| 7 | Sidebar sticks during scroll and clears app bar | VERIFIED (code) | `sticky top-[4rem]` in ArticleSidebar.tsx:23 — scroll behaviour needs human visual confirmation |
| 8 | No `prose` class on article body element | VERIFIED | `grep prose page.tsx` returns no matches; article uses `<article className="max-w-none mb-6">` |

**Score:** 8/8 truths verified (automated); visual rendering flagged for human confirmation

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/globals.css` | `.drop-cap` and `.article-blockquote` CSS classes | VERIFIED | `.drop-cap` at line 81, `.drop-cap::first-letter` at line 84; `.article-blockquote` at line 95 — both substantive rules with design tokens |
| `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` | Archival Header, paragraph map with drop cap and blockquote detection | VERIFIED | 251 lines (min_lines: 100 exceeded); contains Archival Header pattern, dropCapApplied tracking, paragraph map with isBlockquote/stripBlockquotePrefix calls |
| `src/app/__tests__/article-detail.test.ts` | Unit tests for reading time and blockquote detection | VERIFIED | 55 lines (min_lines: 20 exceeded); 10 tests covering all three utility functions — 10/10 pass |
| `src/lib/reader/article-utils.ts` | estimateReadingTime, isBlockquote, stripBlockquotePrefix | VERIFIED | 12 lines; all three functions exported with correct implementations |
| `src/components/reader/ArticleSidebar.tsx` | Client component with sticky sidebar, metadata, ShareButton | VERIFIED | 49 lines (min_lines: 30 exceeded); `"use client"`, exports `ArticleSidebar`, contains sticky aside, all props rendered |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` | `globals.css` | `drop-cap` and `article-blockquote` CSS classes | VERIFIED | Both class names present in page.tsx paragraph map (lines 194, 204) |
| `page.tsx` | Archival Header gradient pattern | `absolute bottom-0` overlay on hero image | VERIFIED | `absolute bottom-0 left-0 right-0` at line 111, `bg-gradient-to-t` at line 109 |
| `page.tsx` | `ArticleSidebar.tsx` | import and render in grid right column | VERIFIED | Import at line 10; rendered at page.tsx:225–232 inside `hidden lg:block` column |
| `ArticleSidebar.tsx` | `ShareButton.tsx` | import and render | VERIFIED | Import at line 3; `<ShareButton title={shareTitle} url={shareUrl} />` at line 45 |
| `page.tsx` | `article-utils.ts` | `estimateReadingTime` for metadata | VERIFIED | Import at line 7; `estimateReadingTime(article.content ?? "")` at line 79 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ARTC-01 | 36-01 | Article body displays drop cap on first paragraph | SATISFIED | `.drop-cap` CSS class applied to first non-blockquote paragraph in paragraph map; `::first-letter` CSS float rule in globals.css |
| ARTC-02 | 36-01 | Blockquotes styled with large serif italic typography and tonal dividers | SATISFIED | `isBlockquote()` drives rendering to `<blockquote className="article-blockquote">`; `.article-blockquote` uses `font-headline`, `italic`, `parchment-dim` background and borders |
| ARTC-03 | 36-02 | Sidebar shows article metadata (author/source, reading time, share button) | SATISFIED | `ArticleSidebar` component wired into `hidden lg:block` column; mobile strip via `lg:hidden` strip; all metadata fields present |
| ARTC-04 | 36-01 | Article header uses "Archival Header" pattern with overlapping title on image | SATISFIED | `header.relative.overflow-hidden` + gradient scrim + `absolute bottom-0` overlay with h1 — matches HeroArticle.tsx reference pattern exactly |

No orphaned requirements found — all four ARTC IDs from REQUIREMENTS.md are accounted for.

---

### Anti-Patterns Found

No anti-patterns detected in phase 36 files:

- No TODO/FIXME/PLACEHOLDER comments
- No empty implementations (return null, return {}, etc.)
- No stub handlers
- No `prose` class remaining on article body

---

### Test Suite Status

| Suite | Result | Notes |
|-------|--------|-------|
| `src/app/__tests__/article-detail.test.ts` | 10/10 PASS | All utility function tests green |
| Full suite | 256/258 PASS | 2 pre-existing failures in `bezirke.test.ts` (phase 01) and `root-layout-adsense.test.ts` (phase 22) — confirmed pre-existing by git history, unrelated to phase 36 |

---

### Human Verification Required

#### 1. Archival Header visual overlay

**Test:** Open an article page that has a `imageUrl` set.
**Expected:** The article title and breadcrumb overlap the bottom of the hero image. A gradient scrim is visible behind the text (dark at bottom, transparent at top). The image fills the header to max 55vh.
**Why human:** CSS absolute positioning and gradient visual appearance cannot be confirmed via grep.

#### 2. Drop cap rendering

**Test:** Open any article with body content. Inspect the first paragraph.
**Expected:** The first character of the first non-blockquote paragraph displays as a large (approximately 4.5rem) serif letter floated left, with body text wrapping around it.
**Why human:** CSS `::first-letter` float is a browser-rendered visual behaviour.

#### 3. Blockquote styling

**Test:** Open an article whose plain-text content contains a paragraph beginning with `>` or with the German lower-9 opening quote `„`.
**Expected:** That paragraph renders as a serif italic block with a tonal parchment background and hairline top/bottom borders — visually distinct from regular body paragraphs.
**Why human:** Rendered blockquote appearance is visual; also requires finding a seed article with blockquote content.

#### 4. Desktop sticky sidebar (lg+ breakpoint)

**Test:** Widen the browser to 1024px or wider and open any article.
**Expected:** A right-column sidebar appears with publisher name ("Von ..."), source label (if applicable), reading time in minutes, published date, and a share button. Scrolling down the page keeps the sidebar stuck in place without overlapping the navigation bar.
**Why human:** Sticky scroll behaviour and responsive breakpoint rendering are visual.

#### 5. Mobile metadata strip (< lg breakpoint)

**Test:** Narrow the browser below 1024px and open the same article.
**Expected:** The sidebar disappears. A compact horizontal row appears directly above the article body showing source (if any), reading time, and the share button.
**Why human:** Responsive toggling between sidebar and strip is visual.

#### 6. No-image header fallback

**Test:** Open an article that has no hero image.
**Expected:** A tonal parchment-dim header block displays with the article title in dark ink text. No broken empty container, no missing image placeholder.
**Why human:** Visual fallback cannot be verified programmatically.

---

### Gaps Summary

No gaps — all automated checks pass. Human visual verification is needed for the six rendering scenarios above before the phase can be declared fully complete.

---

_Verified: 2026-04-01T23:14:00Z_
_Verifier: Claude (gsd-verifier)_
