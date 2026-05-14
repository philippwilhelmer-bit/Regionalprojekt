---
phase: 46
slug: aerzteverzeichnis
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-14
approved: 2026-05-14
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Authoritative source for the per-task verification details: `.planning/phases/46-aerzteverzeichnis/46-RESEARCH.md` → "## Validation Architecture" section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- --run src/lib/content/doctors.test.ts src/lib/content/doctors-actions.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime (quick)** | ~5 s |
| **Estimated runtime (full)** | ~60 s |

Note on pglite parallelism flakiness (carried from Phase 43/44, see `PROGRESS.md` 2026-05-12 entry): full-suite runs intermittently show 7-11 failures that pass in isolation. Doctor tests will reuse the same patterns; run failing tests in isolation to disambiguate genuine regressions from infrastructure noise.

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run <changed test files>` — sub-10s feedback per task
- **After every plan wave:** Run the quick suite for all phase-46 test files together
- **Before `/gsd:verify-work`:** Full project suite must be green (or only baseline failures, see PROGRESS notes)
- **Max feedback latency:** 10 s for the quick path

---

## Per-Task Verification Map

To be populated by the planner during plan-phase. The planner reads the "Validation Architecture" section of `46-RESEARCH.md` and maps each task to its `requirements:` field, `<automated>` block (command + assertions), and Wave 0 dependency (if any).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 46-XX-XX | XX | X | DIR-XX | unit / integration | TBD by planner | ⬜ TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Per RESEARCH.md Validation Architecture, 6 Wave-0 test-file gaps must be created before primary work begins. Files to scaffold:

- [ ] `src/lib/content/doctors.test.ts` — DAL unit tests (DIR-01, DIR-02, DIR-03)
- [ ] `src/lib/content/doctors-actions.test.ts` — Server-Action tests with vi.mock for geocode (DIR-04, DIR-05, DIR-09)
- [ ] `src/lib/reader/doctor-metadata.test.ts` — JSON-LD shape tests (DIR-08)
- [ ] `src/app/(public)/aerzte/__tests__/list-page.test.ts` — list-page render + filter behaviour (DIR-07)
- [ ] `src/app/(public)/aerzte/__tests__/detail-page.test.ts` — slug canonicalization + meta + map fallback (DIR-07, DIR-10)
- [ ] `src/app/sitemap.test.ts` — sitemap inclusion test (or extend if exists) (DIR-11)

Existing infrastructure (vitest + pglite + vi.mock for routes) covers these. No new test framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nominatim geocode returns reasonable lat/lon for a Steiermark address on save | DIR-05 | Hits live third-party API; not deterministic enough for automated assertion. Tests mock the call. | Admin: create a new doctor with address "Graz, Herrengasse 16"; verify `lat≈47.07, lon≈15.44` saved in DB. |
| Map pin renders correctly on detail page (static PNG via mapgen) | DIR-10 | Visual / Blob-storage round-trip; CI cannot validate the rendered tile composite. | Open `/aerzte/{publicId}/{slug}` for an entry with lat/lon; verify map image loads and pin is on the right spot. |
| Google Rich Results validator accepts the MedicalBusiness/Physician/Dentist JSON-LD | DIR-08 | Validator is an external service. | Post-deploy: run `validator.schema.org` and `search.google.com/test/rich-results` against a published detail-page URL. |
| Phase-local design tokens render with correct hex values | DIR-13 | Visual / colour-perception check. | DevTools: inspect `/aerzte` page, confirm `--dir-primary` resolves to `#0f270d` and is NOT applied to non-directory pages. |
| Disclaimer "Angaben ohne Gewähr" visible on detail page | DIR-12 | Copy / placement check. | Open any `/aerzte/{publicId}/{slug}`; confirm disclaimer in footer area. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (populated by planner)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test-file references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10 s
- [ ] `nyquist_compliant: true` set in frontmatter once planner has populated per-task map

**Approval:** approved 2026-05-14 (plan-checker iteration 2 PASS — all 11 iter-1 issues resolved; 1 minor exit-code note carried as informational, mitigated by downstream checkpoints)
