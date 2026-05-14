---
phase: 46-aerzteverzeichnis
plan: 04
subsystem: ui
tags: [public-routes, json-ld, slug-canonical, metadata, server-component, design-tokens, dir-namespace]

# Dependency graph
requires:
  - phase: 46-aerzteverzeichnis
    provides: --dir-* design tokens (Plan 00), Doctor DAL + DoctorWithBezirk type (Plan 01)
provides:
  - Public route /aerzte (filterable doctor list) — DIR-07
  - Public route /aerzte/[publicId]/[slug] (detail with JSON-LD + slug canonical) — DIR-08
  - JSON-LD helper module src/lib/reader/doctor-metadata.ts (Physician / Dentist) — DIR-10
  - Confirmed pattern: phase-local --dir-* utilities resolve under Tailwind v4 @theme block from Plan 00
affects: [46-aerzteverzeichnis-plan-02, 46-aerzteverzeichnis-plan-03, 46-aerzteverzeichnis-plan-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON-LD via dangerouslySetInnerHTML in Server Component <script type='application/ld+json'> — same emit shape as artikel/[publicId]/[slug]/page.tsx"
    - "Slug canonicalization via permanentRedirect when URL slug !== slugify(doctor.name), outside try/catch (throws internally)"
    - "Conditional JSON-LD keys: optional contact fields are OMITTED (not nulled) when source values are null/empty — keeps schema.org payload minimal"
    - "BASE_URL expression is single-sourced — character-for-character identical to src/app/sitemap.ts:10 so canonical host never drifts between detail metadata, JSON-LD, and the sitemap"

key-files:
  created:
    - src/lib/reader/doctor-metadata.ts
    - src/lib/reader/doctor-metadata.test.ts
    - src/app/(public)/aerzte/page.tsx
    - src/app/(public)/aerzte/DoctorPublicCard.tsx
    - src/app/(public)/aerzte/DoctorPublicFilters.tsx
    - src/app/(public)/aerzte/[publicId]/[slug]/page.tsx
    - src/app/(public)/aerzte/[publicId]/[slug]/DoctorMap.tsx
  modified: []

key-decisions:
  - "BASE_URL expression must match src/app/sitemap.ts:10 character-for-character (no www. prefix) — single source of truth for canonical host; intentionally diverges from src/app/(public)/artikel/[publicId]/[slug]/page.tsx:19 which uses 'www.lodenundleute.at' (pre-existing drift in article detail page, not addressed in this plan)"
  - "BAILOUT on Tailwind classes that don't auto-emit from --dir-* tokens — Plan 00 added the tokens under @theme so utilities like bg-dir-surface, rounded-dir-md, p-dir-md etc. now resolve; no manual class-list updates needed"
  - "localStorage `bezirk_selection` auto-prefill DEFERRED to a polish task — query params drive the truth in MVP; documented in DoctorPublicFilters.tsx file header"
  - "Related articles use getArticleByPublicId(id).catch(() => null) + filter(non-null) — page stays resilient when a referenced article is later unpublished/deleted; no try/catch around DB calls in page.tsx (per AGENTS.md, errors bubble to Next.js error boundary)"

patterns-established:
  - "Public listing pattern for editorially curated entities: async Server Component page.tsx + DoctorPublicCard.tsx Server Component card + 'use client' DoctorPublicFilters.tsx with URL-driven query-param state"
  - "Optional JSON-LD shape pattern: build base object with required keys, then conditional `if (value) obj.key = ...` for optional schema.org fields — omits keys (not nulls them) so the payload remains minimal"
  - "Detail page resilience: external referenced records (relatedArticleIds in this plan) resolved via Promise.all(.catch(() => null)) + filter — single unpublished reference never breaks the page render"

requirements-completed: [DIR-07, DIR-08, DIR-10]

# Metrics
duration: 4 min
completed: 2026-05-14
---

# Phase 46 Plan 4: Public Ärzteverzeichnis Pages Summary

**Public `/aerzte` list with bezirk + kategorie + free-text fachrichtung filter chips, and `/aerzte/[publicId]/[slug]` detail page emitting schema.org Physician/Dentist JSON-LD, slug-canonical redirects, static map image, editorial paragraphs, and related-article resilient cards — 13/13 JSON-LD helper tests green, zero new typecheck errors, `npm run build` ships both routes as dynamic.**

## Performance

- **Duration:** 4 min (268 seconds)
- **Started:** 2026-05-14T12:55:03Z
- **Completed:** 2026-05-14T12:59:31Z
- **Tasks:** 3 (one TDD producing 2 commits + 2 straight feature commits = 4 task commits)
- **Files created:** 7
- **Files modified:** 0 (pure additive plan)

## Accomplishments

- `src/lib/reader/doctor-metadata.ts` — 94-line pure helper module with `buildDoctorMetadata`, `buildDoctorJsonLd`, `kategorieLabel`. Conditional emit of `geo`, `medicalSpecialty`, `email`, `telephone`, `sameAs` keys. ZAHNARZT → `Dentist`, otherwise → `Physician`.
- 13/13 vitest cases passing — covers kategorie × geo × fachrichtung × contact-field combinations, plus canonical URL form and German enum labels.
- `/aerzte` route — async Server Component, force-dynamic, parallel-fetches doctors + bezirke, validates kategorie query param against the Prisma enum before passing to DAL. Static metadata export (title + description).
- `DoctorPublicCard` Server Component — links to `/aerzte/{publicId}/{slugify(doctor.name)}`, shows titel+name composition, kategorie label (with fachrichtung suffix for Fachärzte), bezirk name, address, and `Verifiziert` badge when `isVerified=true`. All classes reference `--dir-*` tokens.
- `DoctorPublicFilters` `'use client'` chip bar — Bezirk + Kategorie chips with toggle-off-on-click; free-text fachrichtung input commits on blur; `Zurücksetzen` link clears all params. Kategorie URL values lowercased (`facharzt`), uppercased server-side for Prisma enum match.
- `/aerzte/[publicId]/[slug]` route — force-dynamic, notFound() on unknown publicId, `permanentRedirect` to canonical slug when URL drifts, JSON-LD emitted via `<script type="application/ld+json">`, sections: header (titel/name + Verifiziert badge), contact (address / tel: / mailto: / website target="_blank" rel="noopener noreferrer"), `DoctorMap`, optional editorial paragraphs (split on blank lines), optional related-articles grid via `EditorialStackCard variant="row"`, footer with the `Angaben ohne Gewähr` disclaimer and the German-locale-formatted updatedAt stand-date.
- `DoctorMap` Server Component — `<img>` (not next/image) for Vercel Blob URLs; address-only fallback card when `mapImageUrl=null`; `© basemap.at` attribution figcaption.
- `npm run build` ships both new routes as `ƒ` dynamic routes in the Next.js manifest.

## Task Commits

Each task atomic — Task 4.1 follows TDD (RED + GREEN, no REFACTOR needed):

1. **Task 4.1 RED — failing tests for doctor-metadata** — `1af4d8d` (`test(46-04): add failing tests for doctor-metadata helper module`)
2. **Task 4.1 GREEN — implementation passes 13/13 tests** — `e9695ca` (`feat(46-04): implement doctor-metadata helper module (DIR-10)`)
3. **Task 4.2 — public list + card + filters** — `41146c1` (`feat(46-04): public Ärzte list page with filter chips (DIR-07)`)
4. **Task 4.3 — public detail + map + JSON-LD + slug canonical** — `9044980` (`feat(46-04): public doctor detail page with JSON-LD + slug canonical (DIR-08/10)`)

REFACTOR phase skipped for Task 4.1: the GREEN implementation matches the plan's verbatim code block (which is already minimal — three pure functions, switch-statement for the label enum, conditional assignments for optional JSON-LD keys). No cleanup opportunity that wouldn't reduce readability.

## Files Created/Modified

### Created
- `src/lib/reader/doctor-metadata.ts` (94 lines) — `buildDoctorMetadata` (Next.js Metadata builder, returns `{}` on null doctor), `buildDoctorJsonLd` (schema.org Physician/Dentist payload with conditional optional keys), `kategorieLabel` (German display string from the DoctorKategorie enum). Pure transforms, no DB, no try/catch.
- `src/lib/reader/doctor-metadata.test.ts` (155 lines) — 13 vitest cases driven by a `makeDoctor` factory; all use plain object literals (no DB / no Prisma mocks).
- `src/app/(public)/aerzte/page.tsx` (82 lines) — list route, async Server Component with `force-dynamic`, parallel DAL fetch + bezirke list, kategorie validation gate, dispatches to filter component + card list.
- `src/app/(public)/aerzte/DoctorPublicCard.tsx` (43 lines) — Server Component row link with titel/name composition, verification badge, kategorie+fachrichtung+bezirk meta line, address.
- `src/app/(public)/aerzte/DoctorPublicFilters.tsx` (107 lines) — `'use client'` chip bar; bezirk + kategorie chips, fachrichtung text input, reset link. Drives URL via `router.push` + `useSearchParams`.
- `src/app/(public)/aerzte/[publicId]/[slug]/page.tsx` (170 lines) — detail route with slug canonicalization, JSON-LD emit, contact block, map section, optional editorial section, optional related-articles section, disclaimer footer.
- `src/app/(public)/aerzte/[publicId]/[slug]/DoctorMap.tsx` (38 lines) — Server Component image renderer for the pre-generated static map; address-only fallback when `mapImageUrl=null`.

### Modified
None — purely additive plan.

## JSON-LD Test Coverage Matrix

13 tests cover the full @type × optional-key surface:

| Test | Kategorie | lat/lon | fachrichtung | email | phone | website | titel | Asserts |
|------|-----------|---------|--------------|-------|-------|---------|-------|---------|
| 1    | ALLGEMEINMEDIZIN | n/a | — | — | — | — | — | `@type` = Physician |
| 2    | FACHARZT  | n/a | Kardiologie | — | — | — | — | `@type` = Physician, medicalSpecialty present |
| 3    | ZAHNARZT  | n/a | — | — | — | — | — | `@type` = Dentist, no medicalSpecialty |
| 4    | ALLGEMEINMEDIZIN | 47.07, 15.44 | — | — | — | — | — | geo: GeoCoordinates present |
| 5    | ALLGEMEINMEDIZIN | null/null | — | — | — | — | — | no geo key |
| 6    | ALLGEMEINMEDIZIN | n/a | — | praxis@example.at / null | — | — | — | email key present/absent |
| 7    | ALLGEMEINMEDIZIN | n/a | — | — | +43 316 12345 / null | — | — | telephone key present/absent |
| 8    | ALLGEMEINMEDIZIN | n/a | — | — | — | https://… / null | — | sameAs key present/absent |
| 9    | ALLGEMEINMEDIZIN | n/a | — | — | — | — | Univ.-Doz. Dr. | name combines titel + name |
| 10   | ALLGEMEINMEDIZIN | n/a | — | — | — | — | — | PostalAddress shape (streetAddress, addressLocality, addressRegion='Steiermark', addressCountry='AT') |
| 11   | n/a — null doctor | — | — | — | — | — | — | buildDoctorMetadata returns `{}` |
| 12   | ALLGEMEINMEDIZIN | n/a | — | — | — | — | — | canonical URL = `{baseUrl}/aerzte/{publicId}/{slug}` |
| 13   | each enum | — | — | — | — | — | — | kategorieLabel returns the three German strings |

## BASE_URL Expression — Single Source of Truth

The detail page uses **character-for-character** the same expression as `src/app/sitemap.ts:10`:

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://lodenundleute.at'
```

Verified via grep diff:

```
src/app/(public)/aerzte/[publicId]/[slug]/page.tsx:
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://lodenundleute.at'
src/app/sitemap.ts:
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://lodenundleute.at'
```

NOTE: This **intentionally diverges** from `src/app/(public)/artikel/[publicId]/[slug]/page.tsx:19`, which still uses `'https://www.lodenundleute.at'` (with `www.`). That is a pre-existing inconsistency in the article detail page — fixing it is out of scope for Plan 46-04, but flagged here so a future polish task can unify (probably by replacing all three with a shared `lib/constants/base-url.ts` re-export).

## "Angaben ohne Gewähr" Disclaimer Placement

Detail page footer (`src/app/(public)/aerzte/[publicId]/[slug]/page.tsx:162-167`) — final section after related articles, in `text-dir-on-surface-variant text-sm`:

```
Angaben ohne Gewähr. Diese Daten werden redaktionell gepflegt und können
veraltet sein. Bitte vor einem Besuch direkt beim Arzt nachfragen.

Stand: {doctor.updatedAt.toLocaleDateString('de-AT')}
```

Per CONTEXT.md "Risiken & Considerations" — partial fulfillment of DIR-12; the public route now visibly disclaims the data quality.

## localStorage Auto-Prefill — Deferred

`DoctorPublicFilters.tsx` currently does NOT read `localStorage.bezirk_selection` to seed the bezirk chip when no query param is set. The plan explicitly defers this to a polish task — URL query params are the source of truth in MVP. A header comment in `DoctorPublicFilters.tsx` documents the deferral so a future polish task can find the place to wire it up.

## Decisions Made

See `key-decisions` in frontmatter for the full set. Highlights:

- **BASE_URL identity with sitemap.ts** — explicit, not coincidental. The detail page metadata canonical, the JSON-LD URL, and the sitemap entries all resolve to the same host. (Article detail page drift `www.lodenundleute.at` is pre-existing and out of scope here.)
- **Tailwind --dir-* tokens resolve via Plan 00's @theme additions** — no need to touch globals.css; classes like `bg-dir-surface`, `text-dir-on-surface`, `rounded-dir-md`, `p-dir-margin-mobile`, `gap-dir-sm`, etc. all auto-emit utilities because Plan 00 landed the tokens inside the existing @theme block.
- **localStorage auto-prefill deferred** — keeps the MVP single-source-of-truth (query params) and avoids the complexity of hydrating from client state on the server-side initial render. Documented in DoctorPublicFilters.tsx comment.
- **Related articles use .catch(() => null) on each lookup** — DB resilience: a single unpublished/deleted relatedArticleId never breaks the detail render. Falls under AGENTS.md "stiller Fallback mit console.warn" for external lookups except here we don't even warn (manual editorial list, missing entries are an expected state).

## Deviations from Plan

None — plan executed exactly as written.

The implementation matches the plan's verbatim code blocks for all three tasks (with minor cosmetic additions of `--dir-*` utility classes the plan left as `...` placeholders for me to fill in). No bugs, no missing critical functionality, no blocking issues, no architectural changes required.

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered

None.

Pre-existing TypeScript errors in unrelated files remain out of scope per the project's deferred-items tracking (`/Users/philipp/Claudebot/Regionalprojekt/.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md`):

- `src/lib/admin/map-actions.test.ts(182,3): error TS2304: Cannot find name 'afterEach'.` — pre-existing, documented.
- `src/lib/images/mapgen.test.ts(193,3): error TS2322: Type 'ArrayBuffer | SharedArrayBuffer'…` — Node 24 standard-types collision, pre-existing.

Plan-46-02-related test errors (`src/lib/admin/doctors-actions.test.ts`) appear/disappear depending on Plan 02's in-flight commits — they showed up early in this run, were gone by the end. Not caused by anything in Plan 04.

## User Setup Required

None — purely additive code change. No new environment variables, no external service configuration, no migration to apply (Plan 01 already shipped the migration).

## Next Phase Readiness

- **Plan 46-02 (doctors-actions Trinity)** still in flight on a parallel branch — Plan 04 does NOT consume Plan 02 outputs (read-only). When 02 lands and the admin form creates a doctor with a `mapImageUrl`, the existing DoctorMap component will pick it up on the next page load with zero code change.
- **Plan 46-03 (admin pages)** is unblocked. The kategorie label helper (`kategorieLabel` from `doctor-metadata.ts`) and the slug pattern (`slugify(doctor.name)`) are exports the admin form can reuse.
- **Plan 46-05 (sitemap addition + AppBar link)** is unblocked. The sitemap entry can append `/aerzte/{publicId}/{slugify(name)}` for each doctor using the same BASE_URL constant — proven identical via grep diff. The AppBar nav can link to `/aerzte` as a top-level entry.
- **No production blockers.** Build green, route table shows both new routes as dynamic ƒ entries, all 13 JSON-LD tests pass in isolation.

## Self-Check

Verifying claimed artifacts and commits exist before handoff:

- `src/lib/reader/doctor-metadata.ts` — exists, 94 lines, exports buildDoctorMetadata / buildDoctorJsonLd / kategorieLabel
- `src/lib/reader/doctor-metadata.test.ts` — exists, 13 cases passing
- `src/app/(public)/aerzte/page.tsx` — exists, 82 lines, force-dynamic + Metadata export
- `src/app/(public)/aerzte/DoctorPublicCard.tsx` — exists, 43 lines, Server Component
- `src/app/(public)/aerzte/DoctorPublicFilters.tsx` — exists, 107 lines, 'use client'
- `src/app/(public)/aerzte/[publicId]/[slug]/page.tsx` — exists, 170 lines, force-dynamic + permanentRedirect + JSON-LD + disclaimer
- `src/app/(public)/aerzte/[publicId]/[slug]/DoctorMap.tsx` — exists, 38 lines, Server Component
- Commit `1af4d8d` — `test(46-04): add failing tests for doctor-metadata helper module`
- Commit `e9695ca` — `feat(46-04): implement doctor-metadata helper module (DIR-10)`
- Commit `41146c1` — `feat(46-04): public Ärzte list page with filter chips (DIR-07)`
- Commit `9044980` — `feat(46-04): public doctor detail page with JSON-LD + slug canonical (DIR-08/10)`
- `npm test -- --run src/lib/reader/doctor-metadata.test.ts` → 13/13 pass
- `npm run typecheck` → only 2 pre-existing out-of-scope errors (none in new files)
- `npm run build` → green; `/aerzte` and `/aerzte/[publicId]/[slug]` in route manifest
- Grep verifications all green: force-dynamic (both pages), permanentRedirect (detail), application/ld+json (detail), Angaben ohne Gewähr (detail), getArticleByPublicId (detail), mapImageUrl (DoctorMap), listDoctors (list), BASE_URL match with sitemap.ts (detail vs sitemap)

## Self-Check: PASSED

All 7 created files verified on disk; all 4 task commits resolvable in `git log`; all verification greps return hits; build manifest includes the new routes; tests pass.

---
*Phase: 46-aerzteverzeichnis*
*Completed: 2026-05-14*
