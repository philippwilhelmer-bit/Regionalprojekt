---
phase: "47"
plan: "05"
subsystem: public-ui-fachrichtung
tags: [public, ui, datalist, json-ld, fachrichtung, profilurl, physician]
dependency_graph:
  requires: [47-01, 47-00]
  provides: [public-filter-datalist, jsonld-physician-only, profilurl-link]
  affects: [public-aerzte-list, public-doctor-detail, doctor-metadata-module]
tech_stack:
  added: []
  patterns: [html5-datalist, fachrichtung-label-lookup, allow-list-validation]
key_files:
  created: []
  modified:
    - src/lib/reader/doctor-metadata.ts
    - src/lib/reader/doctor-metadata.test.ts
    - src/app/(public)/aerzte/DoctorPublicFilters.tsx
    - src/app/(public)/aerzte/page.tsx
    - src/app/(public)/aerzte/[publicId]/[slug]/page.tsx
decisions:
  - "medicalSpecialty populated from FACHRICHTUNG_LABELS (German label) not raw enum identifier (D-27)"
  - "HTML5 datalist chosen for Fachrichtung filter — no JS framework needed, native browser autocomplete (D-25)"
  - "profilUrl link text is 'Profil auf aekstmk.or.at' as anchor label (D-28); not shown as raw URL"
  - "fachrichtung URL param validated against FACHRICHTUNG_LABELS allow-list before passing to Prisma (T-47-05-INJ-FILTER)"
  - "Open-redirect risk for profilUrl (T-47-05-OPEN-REDIRECT) accepted — admin-controlled source, rel=noopener noreferrer applied; allow-list deferred to future phase"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-16"
  tasks_completed: 3
  files_changed: 5
---

# Phase 47 Plan 05: Public UI — Fachrichtung Datalist, JSON-LD Physician, ProfilURL Link Summary

Public-facing Ärzte UI updated for Phase 47 schema: Fachrichtung `<datalist>` replaces free-text input on `/aerzte`, JSON-LD always emits `Physician` with German `medicalSpecialty` label from `FACHRICHTUNG_LABELS`, and the detail page renders `profilUrl` as a named anchor "Profil auf aekstmk.or.at".

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 (RED) | Failing tests for FACHRICHTUNG_LABELS medicalSpecialty (Tests 2 + 3) | `d1db407` |
| 1 (GREEN) | Import FACHRICHTUNG_LABELS in doctor-metadata.ts; use for medicalSpecialty | `3ad4c5a` |
| 2 | Rewrite DoctorPublicFilters.tsx — datalist with 51 FACHRICHTUNG_OPTIONS | `6549e1b` |
| 3 | aerzte/page.tsx allow-list validation + detail page profilUrl anchor label | `070039e` |

## Test Results

| Test file | Tests | Status |
|-----------|-------|--------|
| `doctor-metadata.test.ts` | 12 | PASS |

12 tests pass (was 11 before — added Tests 2 + 3 for German label medicalSpecialty assertions).

## TypeScript Check

`npx tsc --noEmit` produces only the two pre-existing errors documented in Plan 47-01 SUMMARY:
- `src/lib/admin/map-actions.test.ts(182,3)` — `afterEach` not in scope (pre-existing)
- `src/lib/images/mapgen.test.ts(193,3)` — ArrayBuffer type (pre-existing)

No new TypeScript errors introduced by Plan 47-05 changes.

## Changes Made

### doctor-metadata.ts (D-27)

Added `import { FACHRICHTUNG_LABELS } from '@/lib/admin/import/fachrichtung-mapping'`. Replaced:
```typescript
medicalSpecialty: doctor.fachrichtung as string,
```
with:
```typescript
medicalSpecialty: FACHRICHTUNG_LABELS[doctor.fachrichtung],
```

JSON-LD now emits the German specialty label (e.g. `"Innere Medizin und Kardiologie"`) rather than the raw enum identifier (`"INNERE_MEDIZIN_UND_KARDIOLOGIE"`). The `@type: 'Physician'` and `sameAs: [doctor.profilUrl]` were already correct from 47-01's Rule 1 fixes.

### DoctorPublicFilters.tsx (D-25)

Replaced free-text Fachrichtung input with HTML5 `<datalist>` over all 51 `FACHRICHTUNG_OPTIONS` (sorted by German locale). URL round-trip:
- Input shows German label via `FACHRICHTUNG_LABELS[active.fachrichtung]`
- `onBlur` reverse-looks up label → enum id via `FACHRICHTUNG_OPTIONS.find()`
- URL carries enum identifier: `?fachrichtung=ALLGEMEINMEDIZIN`

### aerzte/page.tsx (D-26 / T-47-05-INJ-FILTER)

Added `import { FACHRICHTUNG_LABELS }`. Validation added:
```typescript
const fachrichtungCandidate = sp.fachrichtung?.toUpperCase()
const fachrichtungRaw: Fachrichtung | undefined =
  fachrichtungCandidate && fachrichtungCandidate in FACHRICHTUNG_LABELS
    ? (fachrichtungCandidate as Fachrichtung)
    : undefined
```
Invalid enum values are silently dropped (user sees unfiltered list), not forwarded to Prisma.

### [publicId]/[slug]/page.tsx (D-28)

Replaced:
```tsx
<p className="text-dir-on-surface">
  Profil auf aekstmk.or.at:{' '}
  <a href={doctor.profilUrl} ...>{doctor.profilUrl}</a>
</p>
```
with:
```tsx
<p className="text-dir-on-surface">
  <a href={doctor.profilUrl} target="_blank" rel="noopener noreferrer" ...>
    Profil auf aekstmk.or.at
  </a>
</p>
```

## Deviations from Plan

### Auto-fixed Issues (Rule 1)

**1. [Rule 1 - Bug] JSDoc block comment lines not excluded by grep gate pattern**
- **Found during:** Task 1 grep gate verification
- **Issue:** `grep -v '^//'` does not exclude `* text` block comment lines. The doc comment contained "kategorie" and "(D-02 rename)" referencing "website" in block comment body.
- **Fix:** Rewrote JSDoc comment in `doctor-metadata.ts` to remove "kategorie" and "website" words from block comment bodies — matches deviation 4 in Plan 47-01.
- **Files modified:** `src/lib/reader/doctor-metadata.ts`
- **Commit:** `3ad4c5a`

### Scope Notes (from 47-01 Rule 1 overlap)

Plan 47-05 was designed to work from a pre-47-01 baseline. In practice, 47-01 already performed most of the structural work as Rule 1 fixes (removing Dentist branch, replacing website→profilUrl in sameAs). What 47-05 added on top:
- FACHRICHTUNG_LABELS import + use for medicalSpecialty (was raw cast in 47-01's quick fix)
- Full datalist UI (47-01 left free-text placeholder)
- German link label "Profil auf aekstmk.or.at" (47-01 showed raw URL as anchor text)
- fachrichtung allow-list validation on page.tsx (47-01 had unsafe `.toUpperCase() as Fachrichtung`)

## Open-Redirect Risk (T-47-05-OPEN-REDIRECT) — Deferred

The `profilUrl` field is admin-controlled (CSV from Ärztekammer Steiermark). `rel="noopener noreferrer" target="_blank"` applied to mitigate window-opener attacks. A URL allow-list restricting to `aekstmk.or.at` domain is deferred to a future phase if an abuse pattern emerges — see STRIDE register in 47-05-PLAN.md T-47-05-OPEN-REDIRECT.

## Note for Plan 47-06

Full test suite run + final integration check is next. The `DoctorPublicFilters` datalist should be visually verified in Chrome and Firefox (native `<datalist>` autocomplete behavior differs between browsers — both show suggestions, Chrome auto-selects on mobile, Firefox requires explicit interaction).

## TDD Gate Compliance

- Task 1 RED gate commit: `d1db407` (test(47-05): add failing tests for FACHRICHTUNG_LABELS medicalSpecialty)
- Task 1 GREEN gate commit: `3ad4c5a` (feat(47-05): populate medicalSpecialty from FACHRICHTUNG_LABELS)

## Known Stubs

None — all data fields are wired from live database fields. No placeholder values.

## Threat Flags

None beyond what is in the plan's STRIDE register (T-47-05-OPEN-REDIRECT accepted, T-47-05-INJ-FILTER mitigated, T-47-05-XSS mitigated by React escaping).

## Self-Check: PASSED

Files verified:
- `src/lib/reader/doctor-metadata.ts` — contains `FACHRICHTUNG_LABELS`, no kategorie/Dentist/website
- `src/lib/reader/doctor-metadata.test.ts` — 12 tests, all pass
- `src/app/(public)/aerzte/DoctorPublicFilters.tsx` — contains `datalist`, `FACHRICHTUNG_OPTIONS`, no kategorie
- `src/app/(public)/aerzte/page.tsx` — FACHRICHTUNG_LABELS allow-list validation, no kategorie
- `src/app/(public)/aerzte/[publicId]/[slug]/page.tsx` — "Profil auf aekstmk.or.at" anchor label, rel=noopener noreferrer

Commits verified:
- `d1db407` — exists (test RED)
- `3ad4c5a` — exists (feat GREEN)
- `6549e1b` — exists (datalist)
- `070039e` — exists (profilUrl link + validation)
