---
phase: 43-ai-pipeline-quick-wins
plan: 04
subsystem: ai-pipeline
tags:
  - fixtures
  - cutover-gate
  - eval-harness-seed
  - phase-43
requirements:
  - AIPL-01
dependency_graph:
  requires:
    - 43-01-merged-call  # runMergedCall must exist (it does)
  provides:
    - "Pre-merge quality gate (20 fixtures + replay harness)"
    - "Phase 45 eval-harness seed corpus (20 fixtures)"
  affects:
    - "scripts/ai-replay-fixtures.ts (new — manual harness)"
    - "src/test/fixtures/ai-merged/ (new — fixture directory)"
tech_stack:
  added:
    - "@anthropic-ai/sdk (already present; harness imports the existing dep)"
  patterns:
    - "Pure invariant-checker (assertFixture) extracted from harness so smoke test can exercise comparison logic without HTTP"
    - "Entry-point guard on process.argv[1] so importing the harness file does NOT trigger HTTP"
    - "Sort-both-sides for multi-Bezirk comparison (RESEARCH.md Pitfall 7)"
key_files:
  created:
    - src/test/fixtures/ai-merged/f01-graz-traffic-single-bezirk.json
    - src/test/fixtures/ai-merged/f02-obersteiermark-storm-multi.json
    - src/test/fixtures/ai-merged/f03-landesbudget-state-wide.json
    - src/test/fixtures/ai-merged/f04-hartberg-accident-private-person.json
    - src/test/fixtures/ai-merged/f05-officeholder-eroeffnung.json
    - src/test/fixtures/ai-merged/f06-magna-graz-organization-only.json
    - src/test/fixtures/ai-merged/f07-eggenberg-historical-figure.json
    - src/test/fixtures/ai-merged/f08-bundes-pensionsreform-no-relevance.json
    - src/test/fixtures/ai-merged/f09-spielberg-ots-metadata-bleed.json
    - src/test/fixtures/ai-merged/f10-schladming-synonym-match.json
    - src/test/fixtures/ai-merged/f11-mur-flooding-multi-source.json
    - src/test/fixtures/ai-merged/f12-leoben-long-form.json
    - src/test/fixtures/ai-merged/f13-deutschlandsberg-multi-paragraph-lead.json
    - src/test/fixtures/ai-merged/f14-voitsberg-synonym-disambiguation.json
    - src/test/fixtures/ai-merged/f15-weiz-mixed-bezirke.json
    - src/test/fixtures/ai-merged/f16-feldbach-ots-contact-heavy.json
    - src/test/fixtures/ai-merged/f17-bezirk-wahl-state-wide-event.json
    - src/test/fixtures/ai-merged/f18-mariazell-bruck-cross-bezirk-event.json
    - src/test/fixtures/ai-merged/f19-graz-private-citizen-letter.json
    - src/test/fixtures/ai-merged/f20-leibnitz-rss-summary-only.json
    - src/test/fixtures/ai-merged/README.md
    - scripts/ai-replay-fixtures.ts
    - scripts/ai-replay-fixtures.test.ts
  modified:
    - .planning/phases/43-ai-pipeline-quick-wins/deferred-items.md
decisions:
  - "f08 expectedFinalStatus overridden REVIEW (vs the draft's WRITTEN) per CONTEXT.md: bezirkSlugs=[] + isStateWide=false routes through existing REVIEW path; no reviewReason column added (schema-free phase)."
  - "assertFixture extracted as a pure exported function so the smoke test can unit-test the comparison logic against synthetic MergedResult objects without HTTP."
  - "Entry-point guard via process.argv[1] (not import.meta.main) — the codebase compiles in CommonJS-compatible mode under tsx, and the filename check works in both vitest and tsx contexts."
  - "Harness uses Anthropic({ maxRetries: 2 }) to mirror pipeline.ts so it exercises the same retry behaviour."
  - "Harness ALWAYS uses runMergedCall directly — it never branches on AI_USE_MERGED_CALL. The harness's job is to validate the merged path, not the flag."
metrics:
  duration: "~30 min wall clock"
  completed: "2026-05-11"
  tasks: 3
  files_created: 23
  files_modified: 1
  tests_added: 6
---

# Phase 43 Plan 04: Fixture Corpus + Replay Harness Summary

20 captured-payload fixtures plus a manual replay harness establish the Phase 43 cutover gate; all 20 must satisfy their invariants against the real Anthropic API before the merged-call PR can merge.

## One-liner

Captures 20 fixtures (f01..f20) and a manual replay harness (`scripts/ai-replay-fixtures.ts`) that runs each fixture through `runMergedCall` against the real Anthropic API and asserts factual/metadata-bleed invariants — the cutover gate that blocks the Phase 43 merge if any single fixture fails.

## Files added

- `src/test/fixtures/ai-merged/f01..f20.json` — 20 fixture files (10 from the 43-01 draft, 10 newly curated)
- `src/test/fixtures/ai-merged/README.md` — schema documentation + fixture catalogue + regression markers
- `scripts/ai-replay-fixtures.ts` — manual replay harness (exports `assertFixture`, `Fixture`)
- `scripts/ai-replay-fixtures.test.ts` — vitest smoke test (6 cases, runtime < 1s)

## Cutover protocol (operator runbook)

### Step 1 — Capture the pre-merge token baseline

Before merging the Phase 43 cutover PR, capture token totals for ~10 articles processed by the LEGACY two-step path. This is the denominator for the "≥50% input-token reduction" success criterion on the v3.2 ROADMAP.

On production (Vercel) with `AI_USE_MERGED_CALL` unset or `'false'`:

```bash
# Trigger one or two cron runs against the current legacy path:
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/cron
# Or click the admin "Run pipeline now" button.
```

After the run, open the Neon console and run:

```sql
SELECT id, "totalInputTokens", "totalOutputTokens", "articlesProcessed", "startedAt"
FROM "PipelineRun"
ORDER BY "startedAt" DESC
LIMIT 3;
```

Record the totals in the cutover PR description:

```
PipelineRun baseline (legacy two-step, recorded <date>):
  run #N:   totalInputTokens=___, totalOutputTokens=___, articlesProcessed=___
  run #N-1: totalInputTokens=___, totalOutputTokens=___, articlesProcessed=___
  Mean input tokens per article (legacy): ___
```

### Step 2 — Run the replay harness

With `ANTHROPIC_API_KEY` set, from project root:

```bash
ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/ai-replay-fixtures.ts
```

Expected final line: `20/20 passed`. Exit code: `0`.

If any fixture fails, the cutover is BLOCKED (locked decision in `.planning/phases/43-ai-pipeline-quick-wins/43-CONTEXT.md`: any single failure blocks merge).

Paste the full harness output into the cutover PR description as evidence.

### Step 3 — Run the AIPL-10 SQL on production

Before deploying the merged-call code, run this SQL via the Neon console:

```sql
UPDATE article SET status='FETCHED' WHERE status='TAGGED';
```

Idempotent. Re-runs are safe (zero rows affected after the first run). This clears any in-flight `TAGGED` rows so the merged path has a clean cutover — the merged path goes directly from `FETCHED` to `WRITTEN`/`REVIEW` and never produces a `TAGGED` row.

### Step 4 — Deploy + verify

After the SQL runs:

1. Merge the cutover PR.
2. Vercel deploys with `AI_USE_MERGED_CALL` defaulting to `'true'`.
3. Wait for the next cron run (or trigger one manually via the admin button).
4. Inspect the resulting `PipelineRun`:

   ```sql
   SELECT id, "totalInputTokens", "totalOutputTokens", "articlesProcessed", "startedAt"
   FROM "PipelineRun"
   ORDER BY "startedAt" DESC LIMIT 1;
   ```

5. Compute the input-token reduction vs Step 1's baseline. Success criterion (v3.2 ROADMAP): **≥50% reduction on a comparable article count**.

### Rollback

If the merged path misbehaves: set the Vercel env `AI_USE_MERGED_CALL=false` and redeploy. The legacy path is fully in tree; `pipeline.ts` branches inside the per-article loop. No DB rollback needed (schema-free phase).

## Fixture catalogue (20 fixtures)

### Original 10 (from `.planning/drafts/43-01-test-fixtures-DRAFT.md`)

| ID | Coverage | bezirkSlugs | isStateWide | mentionsPriv | finalStatus |
|---|---|---|---|---|---|
| f01-graz-traffic-single-bezirk | Single-Bezirk classification, no person | `['graz']` | false | false | WRITTEN |
| f02-obersteiermark-storm-multi | Multi-Bezirk weather alert | `['liezen', 'murau']` | false | false | WRITTEN |
| f03-landesbudget-state-wide | Steiermark-weit → `isStateWide` | `[]` | true | false | WRITTEN |
| f04-hartberg-accident-private-person | Private individual → REVIEW | `['hartberg-fuerstenfeld']` | false | true | REVIEW |
| f05-officeholder-eroeffnung | Bürgermeister + Landesrat (PHASE REGRESSION MARKER) | `['murtal']` | false | true (P43) → false (P45) | REVIEW (P43) → WRITTEN (P45) |
| f06-magna-graz-organization-only | Organisation only, no individual | `['graz']` | false | false | WRITTEN |
| f07-eggenberg-historical-figure | Historical figure (Erzherzog Johann) | `['graz']` | false | false | WRITTEN |
| f08-bundes-pensionsreform-no-relevance | Federal-level, no Steiermark relevance (PHASE 43 DECISION → REVIEW) | `[]` | false | false | REVIEW |
| f09-spielberg-ots-metadata-bleed | OTS metadata bleed regression | `['murtal']` | false | false | WRITTEN |
| f10-schladming-synonym-match | Gemeinde-synonym → Bezirk mapping | `['liezen']` | false | false | WRITTEN |

### New 10 (Phase 43-04)

| ID | Coverage | bezirkSlugs | isStateWide | mentionsPriv | finalStatus |
|---|---|---|---|---|---|
| f11-mur-flooding-multi-source | Cross-Bezirk Hochwasser (3 Bezirke) | `['murau', 'liezen', 'murtal']` | false | false | WRITTEN |
| f12-leoben-long-form | Long-form input (~400 words) — LONG length tolerance | `['leoben']` | false | false | WRITTEN |
| f13-deutschlandsberg-multi-paragraph-lead | Multi-paragraph lead — `leadMaxSentences: 2` boundary | `['deutschlandsberg']` | false | false | WRITTEN |
| f14-voitsberg-synonym-disambiguation | Two Gemeinden of the same Bezirk → single slug | `['voitsberg']` | false | false | WRITTEN |
| f15-weiz-mixed-bezirke | Mixed-Bezirk political/admin announcement | `['weiz', 'hartberg-fuerstenfeld']` | false | false | WRITTEN |
| f16-feldbach-ots-contact-heavy | OTS contact-block-heavy — 2nd metadata-bleed regression | `['suedoststeiermark']` | false | false | WRITTEN |
| f17-bezirk-wahl-state-wide-event | State-wide Landtagswahl event (2nd state-wide fixture) | `[]` | true | false | WRITTEN |
| f18-mariazell-bruck-cross-bezirk-event | Border story (Mariazell NÖ + Bruck StMk) | `['bruck-muerzzuschlag']` | false | false | WRITTEN |
| f19-graz-private-citizen-letter | Named private citizen in letter-to-editor → REVIEW | `['graz']` | false | true | REVIEW |
| f20-leibnitz-rss-summary-only | RSS `summary`-only minimal input | `['leibnitz']` | false | false | WRITTEN |

## Regression markers (do NOT delete)

- **f05-officeholder-eroeffnung** — flips when Phase 45's officeholder exclusion lands: `mentionsPrivateIndividual` flips `true → false`, `expectedFinalStatus` flips `REVIEW → WRITTEN`. Update this fixture's `expectedOutput` and `expectedFinalStatus` (and `notes`) in Phase 45. The drift IS the regression signal.
- **f08-bundes-pensionsreform-no-relevance** — encodes the Phase 43 decision that `bezirkSlugs=[] && isStateWide=false` routes to `REVIEW`. Reuses the existing REVIEW path (no `reviewReason` column added).
- **f09 / f16** — two layers of OTS-metadata-bleed regression. f09's `rawArticleText` is POST-extractor; f16 simulates the worst case where the extractor leaks the contact block and the merged prompt is the last defence. Both fixtures' `bodyMustNotContain` invariants must hold.
- **f03 / f17** — two state-wide fixtures cover structured `isStateWide=true` replacing the legacy `'steiermark-weit'` magic slug.

## Decisions made

1. **f08 overrides the draft's `WRITTEN` → `REVIEW`** per `43-CONTEXT.md`. The pipeline routes `bezirkSlugs=[] && isStateWide=false` to REVIEW (reuses existing REVIEW path; no schema change). Notes field updated; obsolete reference to "open question 3" removed.
2. **Pure `assertFixture` helper.** Comparison logic is extracted into an exported function so the smoke test can exercise it against synthetic `MergedResult` objects — no HTTP, sub-second CI runtime.
3. **Entry-point guard via `process.argv[1]`.** Filename check works in both `tsx` and vitest contexts (the codebase compiles in CommonJS-compatible mode; `import.meta.main` is not portable here).
4. **Harness uses `runMergedCall` directly.** It never branches on `AI_USE_MERGED_CALL` — the harness's job is to validate the merged path, not the flag.
5. **`maxRetries: 2`** on the Anthropic client mirrors `pipeline.ts` so the harness exercises the same retry behaviour the production path sees.
6. **Sort-both-sides for `bezirkSlugs`.** Both `out.bezirkSlugs` and `fx.expectedOutput.bezirkSlugs` are sorted before comparison (RESEARCH.md Pitfall 7 — avoids order-flakiness on f02, f11, f15).

## Deviations from Plan

None — plan executed exactly as written. The plan called for two file deliverables in Task 2 (harness + smoke test) and the action provided full code skeletons; the only meaningful additions on top of the skeleton were:

- Sixth smoke-test case (`assertFixture flags SEO length violations`) — adds coverage for the SEO length-cap branches that the original 4-case suite did not exercise.
- Explicit `process.argv[1].endsWith('ai-replay-fixtures.ts')` entry-point guard so `main()` does not auto-run on import.
- `id`-vs-filename consistency assertion in the schema test.

Pre-existing vitest failures in `pipeline.test.ts`, `bezirke.test.ts`, and `root-layout-adsense.test.ts` are documented in `deferred-items.md` and are not introduced or affected by 43-04 (which only adds new files).

## Notes for Phase 45 (eval harness)

- These 20 fixtures are the seed corpus for Phase 45's eval harness (`QUAL-09`).
- **f05 is the explicit officeholder-rule regression marker**: when Phase 45's prompt is sharpened to exclude officeholders, f05's `mentionsPrivateIndividual` flips to `false` and `expectedFinalStatus` flips to `WRITTEN`. **Do not delete f05.**
- Phase 45 grows the corpus to 50 and adds quality-rubric scoring (German fluency, factual accuracy, lead-length grading, etc.).
- Phase 45 should also wire the harness into CI (`QUAL-10`) once a non-real-API path exists (mocked or recorded payloads).

## Not in scope for Phase 43

- CI integration of the harness (Phase 45, `QUAL-10`).
- Quality-rubric / German-fluency scoring (Phase 45).
- Real-Anthropic harness runs from inside vitest (cost + flakiness).
- Token-baseline capture itself — Steps 1, 2, 3, 4 of the runbook above are operator actions executed by the cutover pilot, not by this plan's executor.

## Self-Check: PASSED

Files verified present:
- `src/test/fixtures/ai-merged/f01..f20.json` (20 files)
- `src/test/fixtures/ai-merged/README.md`
- `scripts/ai-replay-fixtures.ts`
- `scripts/ai-replay-fixtures.test.ts`
- `.planning/phases/43-ai-pipeline-quick-wins/43-04-SUMMARY.md`
- `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md` (updated)

Commits verified present in `git log`:
- `21f00f1` — test(43-04): add 20 captured-payload fixtures
- `332f140` — test(43-04): add failing smoke test (RED)
- `c657e66` — feat(43-04): implement ai-replay-fixtures harness (GREEN)

Smoke test: 6/6 passing (`scripts/ai-replay-fixtures.test.ts`).
TSC: no new errors on the 23 added files. Two pre-existing TSC errors in unrelated files (mapgen, map-actions) are documented in `deferred-items.md`.
