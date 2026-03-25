---
phase: 6
slug: reader-frontend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run --reporter=verbose src/lib/content/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/content/articles.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `next build` succeeds
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | READ-02, READ-03 | unit | `npx vitest run src/lib/content/articles.test.ts` | ✅ (extend) | ⬜ pending |
| 6-01-02 | 01 | 0 | READ-06 | unit | `npx vitest run src/lib/reader/rss.test.ts` | ❌ W0 | ⬜ pending |
| 6-01-03 | 01 | 0 | SEO-01 | unit | `npx vitest run src/lib/reader/metadata.test.ts` | ❌ W0 | ⬜ pending |
| 6-01-04 | 01 | 0 | SEO-03 | unit | `npx vitest run src/lib/reader/sitemap.test.ts` | ❌ W0 | ⬜ pending |
| 6-01-05 | 01 | 0 | READ-01, AD-01, SEO-04 | unit | `npx vitest run src/lib/reader/` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 1 | READ-01 | unit | `npx vitest run src/lib/reader/` | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 1 | READ-02 | unit | `npx vitest run src/lib/content/articles.test.ts` | ✅ (extend) | ⬜ pending |
| 6-03-01 | 03 | 1 | READ-03 | unit | `npx vitest run src/lib/content/articles.test.ts` | ✅ (extend) | ⬜ pending |
| 6-03-02 | 03 | 1 | READ-04 | manual | Manual browser test on 375px viewport | — | ⬜ pending |
| 6-04-01 | 04 | 2 | READ-06 | unit | `npx vitest run src/lib/reader/rss.test.ts` | ❌ W0 | ⬜ pending |
| 6-04-02 | 04 | 2 | READ-05 | smoke | `npx next build` | — | ⬜ pending |
| 6-05-01 | 05 | 2 | AD-01 | unit | `npx vitest run src/lib/reader/` | ❌ W0 | ⬜ pending |
| 6-06-01 | 06 | 2 | SEO-01 | unit | `npx vitest run src/lib/reader/metadata.test.ts` | ❌ W0 | ⬜ pending |
| 6-06-02 | 06 | 2 | SEO-03 | unit | `npx vitest run src/lib/reader/sitemap.test.ts` | ❌ W0 | ⬜ pending |
| 6-06-03 | 06 | 2 | SEO-04 | unit | `npx vitest run src/lib/reader/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/content/articles.test.ts` — extend with: `getArticleByPublicId`, `listArticlesReader` with pinned→featured→date sort, `getPublishedArticlesByBezirk`
- [ ] `src/lib/reader/rss.test.ts` — covers READ-06: feedsmith generateRssFeed with article fixtures, validates XML output shape and canonical URL in `<link>`
- [ ] `src/lib/reader/sitemap.test.ts` — covers SEO-03: sitemap() output array includes article and bezirk URLs
- [ ] `src/lib/reader/metadata.test.ts` — covers SEO-01: generateMetadata returns correct og:title (seoTitle fallback), og:url, og:description
- [ ] `src/lib/reader/slug.test.ts` — slug generation for German text including umlauts (ä→ae, ö→oe, ü→ue, ß→ss)

*No new test framework install needed — Vitest 2.1.9 already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile layout — no horizontal scroll | READ-04 | Visual/browser behavior; no DOM assertion captures scroll overflow reliably | Open site on real device or DevTools 375px viewport; scroll all pages; check no horizontal overflow |
| Bottom nav visible on all pages | READ-04 | Layout rendering; requires browser | Navigate to homepage, article detail, bezirk page — confirm bottom nav present |
| Cookie consent banner appears on first visit | AD-01 | localStorage state + DOM timing | Clear localStorage, open homepage in private window, confirm banner shows |
| AdSense ad units render in all zones | AD-01 | Requires live AdSense account approval | Check homepage hero, between-articles slots, and article detail slot render `<ins>` elements |
| Impressum satisfies MedienG/ECG (legal) | READ-05 | Legal review required; template has placeholders | Operator review with legal counsel before launch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
