---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 43-04-PLAN.md
last_updated: "2026-05-11T12:17:48.369Z"
last_activity: 2026-05-11 — Plan 43-04 complete (20 captured-payload fixtures + ai-replay-fixtures harness — Phase 43 cutover gate ready)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** v3.2 Text Engine Optimization — Phase 43 (AI Pipeline Quick Wins), Plans 43-01 + 43-02 + 43-04 complete; 43-03 was executing in parallel.

## Current Position

Phase: 43 — AI Pipeline Quick Wins
Plan: 43-04 just completed (fixtures + replay harness — Phase 43 cutover gate ready)
Status: In progress (3 of 4 plans complete after 43-04; 43-03 ran in parallel)
Last activity: 2026-05-11 — Plan 43-04 complete (20 fixtures + ai-replay-fixtures harness)

```
v3.2 Progress: [█████████░] 93% — 13/14 plans (auto-computed)
```

## Performance Metrics

**Velocity (prior milestones):**
- v3.1: 3 phases, 6 plans over ~3 active build days + verification pause (35-day calendar)
- v3.0: 12 plans + 2 quick tasks, ~25 min/plan average
- v2.0: 11 plans over 3 days

**v3.2 in-flight:**

| Phase | Plan | Duration | Tasks | Files | Completed       |
| ----- | ---- | -------- | ----- | ----- | --------------- |
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

### Pending Todos

- Phase 43 cutover gate (operator runbook in `.planning/phases/43-ai-pipeline-quick-wins/43-04-SUMMARY.md`): capture legacy-path token baseline → run `npx tsx scripts/ai-replay-fixtures.ts` and paste 20/20 output into PR → run AIPL-10 SQL → merge + verify ≥50% input-token reduction
- Spike-test Anthropic Message Batches API round-trip latency before committing to it as default in Phase 44 (15-min cron window constraint)
- Address out-of-scope pre-existing TSC/vitest failures noted in `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md`

### Blockers/Concerns

- Batches API latency (minutes to hours) may exceed 15-min Vercel cron window — spike required before Phase 44-02 commits
- Merged prompt quality regression risk — side-by-side eval on 20-article fixture is the Phase 43 gate before cutover
- basemap subdomain round-robin still at single 'maps' subdomain after maps1–4 NXDOMAIN — monitor whether basemap.at restores them (carry-over from v3.1)
- ROADMAP/REQUIREMENTS plan checkboxes drift on plan completion (recurring cosmetic issue across v2.0, v3.0, v3.1) — low priority

## Session Continuity

Last session: 2026-05-11T12:17:48.367Z
Stopped at: Completed 43-04-PLAN.md
Resume with: Phase 43 cutover gate (see `.planning/phases/43-ai-pipeline-quick-wins/43-04-SUMMARY.md` operator runbook) once 43-03's SUMMARY also lands.
