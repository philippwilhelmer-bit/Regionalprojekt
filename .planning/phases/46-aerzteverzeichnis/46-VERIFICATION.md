---
phase: 46-aerzteverzeichnis
verified: 2026-05-14T16:50:00Z
status: passed
score: 13/13 must-haves verified
re_verification: null
human_verification:
  - test: "Visit /aerzte on running dev server and confirm listing renders with -dir-* token-derived surfaces"
    expected: "Computed CSS shows --color-dir-surface (#faf9f5) on <main>; rows show --color-dir-surface-container-lowest; homepage / does NOT reference --color-dir-*"
    why_human: "Browser DevTools required to inspect computed CSS variables — verifier-step 6 in Plan 46-05 covers this. Smoke approved in 46-05-SUMMARY.md."
  - test: "Walk admin create flow + public detail end-to-end against Neon dev DB"
    expected: "Doctor row geocodes to ~47.07,15.44; map image renders from Vercel Blob at maps/doctor-{id}.jpg; JSON-LD via View-Source shows @type Physician + medicalSpecialty for Facharzt"
    why_human: "Requires running Nominatim + Vercel Blob + basemap.at composite — covered by Plan 46-05 9-step smoke (verifier approved per 46-05-SUMMARY.md)."
  - test: "sitemap.xml against production NEXT_PUBLIC_BASE_URL"
    expected: "Doctor URLs match detail-page canonical character-for-character; no www. drift"
    why_human: "Requires production env var resolution; locally only the fallback is exercised."
---

# Phase 46: Ärzteverzeichnis Verification Report

**Phase Goal:** Editorial CRUD-pflegte Liste aller Allgemeinmediziner / Fachärzte / Zahnärzte mit Bezirk-Filter, Detail-Pages mit Map-Pin (Nominatim-geocoded), editorial notes + verifizierungs-badge + manuelle Artikel-Cross-Links. Eigenständige Route `/aerzte` + Admin-CRUD unter `/admin/aerzte`. Neue Design-Tokens additiv, phase-local (Master DESIGN.md unangetastet).

**Verified:** 2026-05-14T16:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Doctor model + DoctorKategorie enum exist in `prisma/schema.prisma` | ✓ VERIFIED | schema.prisma:201-231 (enum), :207-232 (model); Bezirk back-relation at :48 |
| 2 | Migration `prisma/migrations/20260515_phase46_doctors/migration.sql` is present and applied (Neon dev confirmed during 46-03 smoke) | ✓ VERIFIED | File exists (1915 bytes), valid SQL: CREATE TYPE + CREATE TABLE + 4 indexes + FK ON DELETE RESTRICT |
| 3 | DAL `src/lib/content/doctors.ts` follows Prisma-DI duck-typing pattern | ✓ VERIFIED | doctors.ts:47 — `'$connect' in clientOrOptions`; three overloaded exports (listDoctors, getDoctorByPublicId, getDoctorById); verified-first ordering at :85 |
| 4 | Server-Action-Trinity in `src/lib/admin/doctors-actions.ts` (Db / Action / Form for create/update/toggleVerified/softDelete) | ✓ VERIFIED | 4 *Db + 4 Action + 4 Form exports; `'use server'` directive at :28; 8 `await requireAuth()` calls, all outside try/catch |
| 5 | Admin routes `/admin/aerzte` + `new/` + `[id]/edit/` exist and wire Server Actions | ✓ VERIFIED | 6 files present in src/app/(admin)/admin/aerzte/; new/page.tsx:26 binds createDoctorForm; [id]/edit/page.tsx:45 binds updateDoctorForm; DoctorRow.tsx:72,87 bind toggle + delete |
| 6 | Public routes `/aerzte` + `[publicId]/[slug]` exist | ✓ VERIFIED | (public)/aerzte/page.tsx, DoctorPublicCard.tsx, DoctorPublicFilters.tsx, [publicId]/[slug]/page.tsx, DoctorMap.tsx all present |
| 7 | Slug canonicalization via permanentRedirect on detail page | ✓ VERIFIED | [publicId]/[slug]/page.tsx:36-39 — `if (slug !== canonical) permanentRedirect(...)` |
| 8 | JSON-LD with @type Physician/Dentist per kategorie | ✓ VERIFIED | doctor-metadata.ts:51 — `kategorie === 'ZAHNARZT' ? 'Dentist' : 'Physician'`; emitted via `<script type="application/ld+json">` at [publicId]/[slug]/page.tsx:65-68 |
| 9 | `src/app/sitemap.ts` includes /aerzte + doctor URLs | ✓ VERIFIED | sitemap.ts:20-30 (helper), :53 (listDoctors limit 5000), :74 (/aerzte index), :77 (...doctorEntries) |
| 10 | Ärzte links in LodenAppBar + Footer (BottomNav untouched) | ✓ VERIFIED | LodenAppBar.tsx:74 (desktop), :99 (mobile drawer); Footer.tsx:40; BottomNav last touched in commit 070a5aa (Phase 19), no Phase 46 commits |
| 11 | `--color-dir-*`, `--radius-dir-*`, `--spacing-dir-*` tokens additive in globals.css (master tokens preserved) | ✓ VERIFIED | 61 --*-dir-* tokens in globals.css; --color-primary/-accent/-background/-text still present at :5-9 (master untouched) |
| 12 | `mapgen.ts` accepts `pathPrefix` option; `doctors-actions.ts` invokes with `pathPrefix: 'doctor'` | ✓ VERIFIED | mapgen.ts:585-602 (helper + `||` guard), :598,648 (pathPrefix in signatures); doctors-actions.ts:199 (`pathPrefix: 'doctor'`) |
| 13 | "Angaben ohne Gewähr" disclaimer on detail page | ✓ VERIFIED | [publicId]/[slug]/page.tsx:163 — disclaimer literal "Angaben ohne Gewähr. Diese Daten werden redaktionell gepflegt..." |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `prisma/schema.prisma` | Doctor model + DoctorKategorie enum + Bezirk.doctors back-rel | ✓ VERIFIED | All three present; field set matches DIR-01 spec verbatim |
| `prisma/migrations/20260515_phase46_doctors/migration.sql` | Additive migration | ✓ VERIFIED | 1915 bytes; CREATE TYPE + CREATE TABLE + indexes + FK; Neon-applied per 46-03-SUMMARY.md |
| `src/lib/content/doctors.ts` | Read DAL with duck-typed DI | ✓ VERIFIED | 132 lines; 3 overloaded exports; ordering verified |
| `src/lib/content/doctors.test.ts` | pglite unit tests | ✓ VERIFIED | 21 tests pass in isolation |
| `src/lib/admin/doctors-actions.ts` | Server-Action-Trinity | ✓ VERIFIED | 342 lines; 4 *Db + 4 Action + 4 Form + 3 input interfaces; `'use server'` |
| `src/lib/admin/doctors-actions.test.ts` | Action/Form tests | ✓ VERIFIED | 21 tests pass; vi.doMock for prisma, vi.mock for auth/geocode/mapgen |
| `src/lib/reader/doctor-metadata.ts` | JSON-LD helper | ✓ VERIFIED | 95 lines; 3 pure-fn exports; Physician/Dentist mapping correct |
| `src/lib/reader/doctor-metadata.test.ts` | JSON-LD helper tests | ✓ VERIFIED | 13 tests pass |
| `src/app/(admin)/admin/aerzte/page.tsx` | List + filters | ✓ VERIFIED | `force-dynamic`, listDoctors + listBezirke, renders DoctorFilters + DoctorRow |
| `src/app/(admin)/admin/aerzte/DoctorFilters.tsx` | Filter chips | ✓ VERIFIED | Present (4463 bytes) |
| `src/app/(admin)/admin/aerzte/DoctorRow.tsx` | Row with toggle + delete | ✓ VERIFIED | toggleVerifiedForm + softDeleteDoctorForm wired; missing-geo chip on lat===null |
| `src/app/(admin)/admin/aerzte/DoctorForm.tsx` | Shared form | ✓ VERIFIED | Server Component; bg-dir-error-container warning at :34 when lat=null |
| `src/app/(admin)/admin/aerzte/new/page.tsx` | New form | ✓ VERIFIED | binds createDoctorForm; force-dynamic |
| `src/app/(admin)/admin/aerzte/[id]/edit/page.tsx` | Edit form | ✓ VERIFIED | binds updateDoctorForm; notFound() on missing; force-dynamic |
| `src/app/(public)/aerzte/page.tsx` | Public list | ✓ VERIFIED | `force-dynamic`; listDoctors + listBezirke; metadata export |
| `src/app/(public)/aerzte/DoctorPublicCard.tsx` | Public list card | ✓ VERIFIED | 43 lines; uses slugify + kategorieLabel |
| `src/app/(public)/aerzte/DoctorPublicFilters.tsx` | Client filters | ✓ VERIFIED | `'use client'`; router.push driven |
| `src/app/(public)/aerzte/[publicId]/[slug]/page.tsx` | Detail page | ✓ VERIFIED | permanentRedirect + JSON-LD + disclaimer + force-dynamic + EditorialStackCard import correct |
| `src/app/(public)/aerzte/[publicId]/[slug]/DoctorMap.tsx` | Map component | ✓ VERIFIED | renders <img src={mapImageUrl}>; null-state fallback |
| `src/app/sitemap.ts` | Sitemap w/ doctor entries | ✓ VERIFIED | named export buildDoctorSitemapEntries; spread into return at :77 |
| `src/app/__tests__/sitemap-doctors.test.ts` | Helper unit tests | ✓ VERIFIED | 5 tests pass |
| `src/components/reader/LodenAppBar.tsx` | Ärzte link desktop + mobile | ✓ VERIFIED | href="/aerzte" at :74 (desktop) and :99 (mobile drawer with setMenuOpen(false)) |
| `src/components/reader/Footer.tsx` | Ärzteverzeichnis link | ✓ VERIFIED | <li> at :40 in Rubriken column |
| `src/components/reader/BottomNav.tsx` | UNCHANGED | ✓ VERIFIED | Last touched commit 070a5aa (Phase 19); no Phase 46 commits |
| `src/lib/images/mapgen.ts` | pathPrefix option added | ✓ VERIFIED | uploadToBlob :585-602 with `|| 'article'` guard; generateMapImage :648 accepts options param |
| `src/app/globals.css` | --dir-* tokens additive | ✓ VERIFIED | 61 --*-dir-* tokens inside @theme; master --color-primary/-accent/-background/-text still at :5-9 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `aerzte/page.tsx` (public) | `listDoctors` | searchParams → ListDoctorsOptions → DAL | ✓ WIRED | `listDoctors({ bezirkSlug, kategorie, fachrichtung, limit: 200 })` at :37-43 |
| Admin `page.tsx` | `listDoctors` | filters from searchParams | ✓ WIRED | `listDoctors({ bezirkSlug, kategorie, isVerified, limit: 200 })` at :48-53 |
| `new/page.tsx` form | `createDoctorForm` Server Action | `formAction={createDoctorForm}` | ✓ WIRED | :26 — direct prop wiring |
| `[id]/edit/page.tsx` form | `updateDoctorForm` | `formAction={updateDoctorForm}` | ✓ WIRED | :45 — direct prop wiring |
| `DoctorRow` toggle button | `toggleVerifiedForm` | `<form action={toggleVerifiedForm}>` | ✓ WIRED | :72 |
| `DoctorRow` delete button | `softDeleteDoctorForm` | `<form action={softDeleteDoctorForm}>` | ✓ WIRED | :87 + JS-less `<details>` confirm |
| `createDoctor` Server Action | `generateMapImage(..., { pathPrefix: 'doctor' })` | two-phase create after insert | ✓ WIRED | doctors-actions.ts:193-200 — pathPrefix literal 'doctor' confirmed |
| `createDoctor` | `geocodeLocation(defaultPrisma, address)` | try/catch wrapper, non-blocking | ✓ WIRED | :182 inside geocodeAndMap; persist-row-with-null-geo on failure |
| Detail page | `permanentRedirect(/aerzte/${publicId}/${canonical})` | slug canonicalization | ✓ WIRED | :36-39 |
| Detail page | JSON-LD emit | `<script type="application/ld+json">` | ✓ WIRED | :65-68 |
| Detail page | `getArticleByPublicId(id).catch(() => null)` | resilient related-articles | ✓ WIRED | :49-50 |
| `sitemap.ts` default | `buildDoctorSitemapEntries` | composition + spread | ✓ WIRED | :69 invocation, :77 spread |
| `sitemap.ts` BASE_URL | `[publicId]/[slug]/page.tsx` BASE_URL | identical literal expression | ✓ WIRED | Both `process.env.NEXT_PUBLIC_BASE_URL ?? 'https://lodenundleute.at'` (sitemap:11, detail:20) — char-for-char match |
| `(admin)/layout.tsx` | auth gate | `verifySessionCookie + redirect('/admin/login')` | ✓ WIRED | layout.tsx:3,18 — covers /admin/aerzte/* by route-group containment |
| Every *Action + *Form | `await requireAuth()` outside try/catch | AGENTS.md auth rule | ✓ WIRED | 8 occurrences, all bare (no enclosing try) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| DIR-01 | 46-01 | Doctor Prisma model + indexes | ✓ SATISFIED | schema.prisma:207-232 |
| DIR-02 | 46-01 | DoctorKategorie enum (3 values) | ✓ SATISFIED | schema.prisma:201-205 + migration.sql:8 |
| DIR-03 | 46-01 | DAL exports + duck-typed DI + ordering | ✓ SATISFIED | doctors.ts:47,85 |
| DIR-04 | 46-02 | Server-Action-Trinity Db/Action/Form | ✓ SATISFIED | doctors-actions.ts — 12 functional exports |
| DIR-05 | 46-02 | Geocode + non-blocking failure → null-geo persist + admin warning | ✓ SATISFIED | doctors-actions.ts:179-208 + DoctorForm.tsx:33-38 |
| DIR-06 | 46-03 | Admin pages /admin/aerzte + /new + /[id]/edit | ✓ SATISFIED | 6 files in (admin)/admin/aerzte/ |
| DIR-07 | 46-04 | Public /aerzte list with bezirk/kategorie/fachrichtung filters | ✓ SATISFIED | (public)/aerzte/page.tsx + DoctorPublicFilters.tsx; localStorage auto-prefill deferred (documented) |
| DIR-08 | 46-04 | /aerzte/[publicId]/[slug] with permanentRedirect | ✓ SATISFIED | [publicId]/[slug]/page.tsx:36-39 |
| DIR-09 | 46-00, 46-02 | Map asset via pathPrefix='doctor' | ✓ SATISFIED | mapgen.ts:585-602,648 + doctors-actions.ts:199 |
| DIR-10 | 46-04 | JSON-LD Physician/Dentist | ✓ SATISFIED | doctor-metadata.ts:51 + detail page emit |
| DIR-11 | 46-05 | sitemap.xml /aerzte + doctor URLs | ✓ SATISFIED | sitemap.ts:53,69,74,77 |
| DIR-12 | 46-05 | LodenAppBar + Footer links + disclaimer | ✓ SATISFIED | LodenAppBar:74,99; Footer:40; detail-page disclaimer at :163 |
| DIR-13 | 46-00 | --dir-* tokens additive in globals.css | ✓ SATISFIED | 61 tokens; master tokens at :5-9 preserved |

All 13 plan-declared DIR IDs are SATISFIED. No orphaned requirement IDs detected.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none in Phase-46 sources) | — | — | — | — |

Scans run on doctor-specific sources (DAL, actions, helpers, admin pages, public pages, sitemap.ts, LodenAppBar.tsx, Footer.tsx): zero TODO/FIXME/XXX/HACK/PLACEHOLDER occurrences. Two pre-existing TypeScript errors persist in `src/lib/admin/map-actions.test.ts:182` (missing `afterEach` import) and `src/lib/images/mapgen.test.ts:193` (Node-24 ArrayBuffer/SharedArrayBuffer collision) — both predate Phase 46 and are tracked in `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md`. ℹ Info only; not Phase-46 regressions.

### Human Verification Required

Phase 46-05 already executed a 9-step end-to-end smoke (admin create → public list → public detail → JSON-LD source view → sitemap.xml → token computation in DevTools → disclaimer copy → `npm run build` → full test suite) which the human verifier approved per 46-05-SUMMARY.md. Items below are residual recommendations rather than blocking gates — automated checks pass; no fresh human verification is required to close this phase, but production rollout would benefit from:

#### 1. Production NEXT_PUBLIC_BASE_URL parity check

**Test:** Inspect production /sitemap.xml against a deployed doctor detail URL.
**Expected:** Doctor URL host in sitemap matches the `<link rel="canonical">` / JSON-LD `url` on the corresponding detail page exactly (no `www.` drift).
**Why human:** Only the fallback `'https://lodenundleute.at'` is exercised locally. Production env var resolution may differ. Out of scope for code-level verification.

#### 2. Real Nominatim geocode round-trip

**Test:** Create a doctor via /admin/aerzte/new with a known Steiermark address.
**Expected:** lat/lon written to DB; map image generated and visible at /aerzte/{publicId}/{slug}.
**Why human:** Requires live Nominatim + Vercel Blob + basemap.at composite; smoke step 1+3 in 46-05 covers this and is reported PASS.

#### 3. Sitemap output bounded at scale

**Test:** Populate dev DB with > 500 doctors and confirm sitemap.xml still serves <30s.
**Expected:** No timeout; entries respect the `limit: 5000` ceiling.
**Why human:** Performance behaviour can only be verified at realistic data scale; current dev DB has 1 doctor row.

### Gaps Summary

No gaps. All 13 observable truths verified against the codebase. All 26 must-have artifacts present and substantive. All 15 key links wired. Requirements coverage 13/13 SATISFIED. Anti-pattern scan clean for Phase 46 sources. Test suite green for the 60 doctor-specific cases (doctors.test.ts 21, doctors-actions.test.ts 21, doctor-metadata.test.ts 13, sitemap-doctors.test.ts 5). The two TypeScript errors flagged by `tsc --noEmit` are pre-existing baseline issues outside Phase 46 scope.

The phase delivered its goal: an editorial CRUD-pflegte doctor directory with bezirk/kategorie filtering, slug-canonical detail pages with Nominatim-geocoded map pins, editorial notes + verification badge + cross-linked articles, Admin shell under /admin/aerzte, public shell at /aerzte, additive phase-local design tokens, sitemap inclusion, and AppBar/Footer discoverability — all without disturbing master design tokens, the BottomNav 2-tab lock, or the article-side mapgen flow.

---

*Verified: 2026-05-14T16:50:00Z*
*Verifier: Claude (gsd-verifier)*
