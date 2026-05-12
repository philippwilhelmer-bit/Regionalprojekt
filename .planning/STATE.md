---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Phase 43 cutover gate FAILED + rolled back to legacy; production verified on legacy path via run #53
last_updated: "2026-05-12T13:16:00.000Z"
last_activity: 2026-05-12 — Phase 43 cutover gate run; gate FAILED (9/20 fixtures + 1.3% reduction); rollback executed via Vercel AI_USE_MERGED_CALL=false; verified by cron run #53 matching legacy token shape
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** v3.2 Text Engine Optimization — Phase 43 (AI Pipeline Quick Wins) plans complete; cutover gate FAILED + ROLLED BACK 2026-05-12. Production reverted to legacy two-step path via Vercel env `AI_USE_MERGED_CALL=false`; verified by cron run #53 (Ø 2593 input / Ø 389 output per article, output-scaling-with-written-ratio signal matches legacy). v3.2 ≥50% input-token reduction target deferred to a future re-cutover attempt after merged-prompt quality fixes.

## Current Position

Phase: 43 — AI Pipeline Quick Wins (4/4 plans complete; cutover gate FAILED + rolled back)
Plan: 43-04 cutover gate executed + rolled back 2026-05-12
Status: Rollback complete. Production on legacy path verified via run #53. Phase 43 closed minus the ≥50% reduction success criterion — that goal is deferred to a future re-cutover attempt after merged-prompt quality fixes (or to Phase 45 quality-eval loop).
Last activity: 2026-05-12 — operator flipped Vercel env, redeployed, manual cron triggered, verification query confirms legacy shape on run #53

```
v3.2 Progress: [██████████] 100% — 14/14 plans in phase 43 (auto-computed; cutover gate is operator-side, not a plan)
```

## Performance Metrics

**Velocity (prior milestones):**
- v3.1: 3 phases, 6 plans over ~3 active build days + verification pause (35-day calendar)
- v3.0: 12 plans + 2 quick tasks, ~25 min/plan average
- v2.0: 11 plans over 3 days

**v3.2 in-flight:**

| Phase | Plan | Duration | Tasks | Files | Completed       |
| ----- | ---- | -------- | ----- | ----- | --------------- |
| 43    | 03   | 28min    | 4     | 9     | 2026-05-11      |
| 43    | 04   | 28min    | 3     | 23    | 2026-05-11      |
| 43    | 02   | 7min     | 2     | 6     | 2026-05-11      |
| 43    | 01   | 8min     | 2     | 2     | 2026-05-11      |

*Updated after each milestone completion*

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions for full history.

**v3.2-specific decisions:**
- Merged single-call pipeline (runWriteAndTag) replaces step1-tag + step2-write — highest-leverage change, underpins everything else in the milestone
- Phase 43 is schema-free: no `prisma db push` or migration required — all wins via code changes only
- Phase 44 ordering: TLM-01–04 (telemetry schema + admin views) before TLM-05–07 (Batches API + BATCHED enum) so instrumentation is already in place when async path lands
- QUAL-03 (historical REVIEW re-evaluation) is opt-in via admin button — never automatic — to prevent irreversible misclassification
- **43-02:** Inline CANDIDATE_BODY_FIELDS in `extractors/ots.ts` rather than refactoring `ingestion/adapters/ots-at.ts` to export `extractBody` — keeps plan 43-02 scoped to the new package only.
- **43-02:** Apply two-layer strip (field-name allowlist + line-level regex) — defence-in-depth against contact blocks embedded in OTS body text.
- **43-02:** MANUAL absent from `extractorRegistry` — mirrors existing `adapterRegistry` pattern; default fallback is `[title, content].filter(Boolean).join('\n\n')`.
- **43-01:** Schema typing via `satisfies Anthropic.Messages.Tool.InputSchema` (not `as const`) — SDK's `required` is mutable `Array<string>`, so `as const` would have forced an `as any` cast that violates AIPL-02.
- **43-01:** Replicate `buildBezirkContext` format from `step1-tag.ts` verbatim in `merged.ts` rather than import — isolates the new module so `step1-tag.ts` can be deleted in v3.3 without touching `merged.ts`.
- **43-01:** Defensive `isStateWide → bezirkSlugs=[]` guard lives at the schema boundary inside `runMergedCall`, not in the pipeline integration — keeps the contract clean for all downstream consumers.
- [Phase 43-01]: Schema typed via 'satisfies Anthropic.Messages.Tool.InputSchema' (not 'as const') to keep AIPL-02 invariant (no 'as any')
- [Phase 43-01]: Replicate buildBezirkContext format from step1-tag.ts verbatim in merged.ts (no shared import) — isolates new module for v3.3 cleanup
- [Phase 43-01]: Defensive isStateWide → bezirkSlugs=[] guard lives at the schema boundary in runMergedCall, not the pipeline
- [Phase 43]: 43-04: f08 expectedFinalStatus overridden REVIEW per CONTEXT.md — bezirkSlugs=[] + isStateWide=false routes through existing REVIEW path (schema-free, no reviewReason column)
- [Phase 43]: 43-04: assertFixture extracted as pure exported function so smoke test can unit-test comparison logic against synthetic MergedResult — no HTTP, sub-second CI runtime
- [Phase 43]: 43-04: harness entry-point guard via process.argv[1] filename check (works in both tsx CLI and vitest contexts); harness always uses runMergedCall directly — never branches on AI_USE_MERGED_CALL
- [Phase 43]: 43-03: ProcessResult.totalCachedInputTokens kept in-memory only (not persisted to PipelineRun column this phase) so v3.2 stays schema-free; Phase 44 persists it
- [Phase 43]: 43-03: AIPL-09 test asserts factory source string contains 'maxRetries: 2' (SDK constructor internals are private) — brittle to formatting, stable to API drift; accepted trade-off
- [Phase 43]: 43-03: Out-of-plan callers (map-actions.ts, generate-map/route.ts + their tests) updated as Rule 3 deviation — llmLocationFallback signature change ripples there; plan's <done> only listed pipeline.ts + locextract.ts
- [Phase 43]: 43-03: Pipeline-level `isStateWide && bezirkSlugs.length > 0` warn is unreachable under runMergedCall (schema-boundary guard pre-clears) — retained as defence-in-depth tripwire; merged-path test asserts observable contract (no ArticleBezirk rows) not the warn
- [Phase 43]: 43-03: AIPL-07 retry selector + AIPL-10 one-time SQL together provide defence-in-depth orphan cleanup for the TAGGED → FETCHED cutover

### Pending Todos

- **Phase 43 merged-prompt tuning (before any re-cutover):** address the 11 harness failures — body-missing factual fidelity (f01/f04/f05/f08/f09/f16/f17/f18/f20), seoTitle length overflow (f12 +1, f15 +11), bezirk tag hallucination on f18. After tuning, re-run `scripts/ai-replay-fixtures.ts`; gate is 20/20.
- **Cron-Runbook-Korrektur:** `43-04-SUMMARY.md` Step 1 dokumentiert `curl -X POST /api/cron` — Route akzeptiert nur GET (Vercel-Cron-Konvention). Manuell-Trigger-Beispiel auf GET ändern.
- Spike-test Anthropic Message Batches API round-trip latency before committing to it as default in Phase 44 (15-min cron window constraint).
- Phase 44 telemetry schema (TLM-01..04) should be designed to log both legacy and merged paths so future cutover attempts have native cost telemetry, not historical aggregates.
- Address out-of-scope pre-existing TSC/vitest failures noted in `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md` (bezirke.test.ts CONF-02 data drift, root-layout-adsense.test.ts Plus_Jakarta_Sans, mapgen.test.ts ArrayBuffer/SharedArrayBuffer post-Node24, map-actions.test.ts afterEach import).

### Blockers/Concerns

- **Phase 43 cutover gate FAILED 2026-05-12 — RESOLVED via rollback.** Merged path fails 11/20 fixtures (real regressions: source-central facts dropped from body — A2/Auffahrunfall, Pensionsreform, Knittelfeld, Mariazell, Hartberg, Gamlitz/Weinkultur, Ladepunkte, Landtagswahl). Production reverted to legacy via `AI_USE_MERGED_CALL=false` on Vercel + redeploy + verified on run #53 (2026-05-12 13:02 UTC). See DECISIONS.md 2026-05-12. Re-cutover requires merged-prompt quality fixes first.
- **Anthropic prompt cache structurally useless under Vercel-Hobby 1/day cron** — cache TTL is 5 min, so every cron start is cold. The ≥50% input-token reduction target on v3.2 ROADMAP may be unreachable without either (a) more frequent cron (Pro plan) or (b) the cache architecture redesigned to write to a longer-lived medium. Document this constraint in v3.2 retrospective.
- Batches API latency (minutes to hours) may exceed 15-min Vercel cron window — spike required before Phase 44-02 commits
- basemap subdomain round-robin still at single 'maps' subdomain after maps1–4 NXDOMAIN — monitor whether basemap.at restores them (carry-over from v3.1)
- ROADMAP/REQUIREMENTS plan checkboxes drift on plan completion (recurring cosmetic issue across v2.0, v3.0, v3.1) — low priority

## Session Continuity

Last session: 2026-05-12T13:16:00Z
Stopped at: Phase 43 cutover gate FAILED + rolled back; production verified on legacy path via cron run #53. Phase 43 is now operationally closed with the ≥50% reduction success criterion explicitly deferred.
Resume with:
1) Optional: append a "Post-merge addendum" to `.planning/phases/43-ai-pipeline-quick-wins/43-04-SUMMARY.md` recording the gate failure + rollback (parallel to DECISIONS.md). Low priority.
2) Decide what comes next:
   - **Path A:** tune `merged.ts` system prompt to fix the 11 harness failures (body factual-fidelity, seoTitle length, bezirk tagging), re-run harness, attempt re-cutover. Couples merged-quality work with a follow-up Phase 43.x or rolls into Phase 45 quality loop.
   - **Path B:** park merged work, proceed to Phase 44 (TLM-01..04 telemetry + Batches API). DECISIONS.md outlines trade-offs.
3) Either path: address the cron-runbook GET-vs-POST correction in `43-04-SUMMARY.md`.

Artifacts from this session:
- `/tmp/baseline.json` — historical PipelineRun data
- `/tmp/baseline-post-rollback.json` — post-rollback snapshot with run #53
- `/tmp/replay-v3-cutover-fail.log` — harness output with 11 failures detailed
- `/tmp/baseline-query.ts`, `/tmp/aipl-10-sql.ts` — one-off scripts (kept for reproducibility, not committed)
