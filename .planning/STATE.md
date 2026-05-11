---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 43-02-PLAN.md (source-typed extractors)
last_updated: "2026-05-11T11:44:22.809Z"
last_activity: 2026-05-11 — Plan 43-02 complete (source-typed extractors, AIPL-06 closed)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 4
  completed_plans: 1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** v3.2 Text Engine Optimization — Phase 43 (AI Pipeline Quick Wins), Plan 43-02 complete

## Current Position

Phase: 43 — AI Pipeline Quick Wins
Plan: 43-03 (next — wires extractArticleText into pipeline.ts)
Status: In progress (1 of 4 plans complete)
Last activity: 2026-05-11 — Plan 43-02 complete (source-typed extractors, AIPL-06 closed)

```
v3.2 Progress: [██░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 8% — 0/3 phases · 1/4 plans in phase 43
```

## Performance Metrics

**Velocity (prior milestones):**
- v3.1: 3 phases, 6 plans over ~3 active build days + verification pause (35-day calendar)
- v3.0: 12 plans + 2 quick tasks, ~25 min/plan average
- v2.0: 11 plans over 3 days

**v3.2 in-flight:**

| Phase | Plan | Duration | Tasks | Files | Completed       |
| ----- | ---- | -------- | ----- | ----- | --------------- |
| 43    | 02   | 7min     | 2     | 6     | 2026-05-11      |

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

### Pending Todos

- Plan 43-03: wire `extractArticleText` from `@/lib/ai/extractors` into `pipeline.ts:115-117`, replacing the `JSON.stringify(rawPayload)` call
- Spike-test Anthropic Message Batches API round-trip latency before committing to it as default in Phase 44 (15-min cron window constraint)
- Record pre-merge token baseline on a representative article set before Phase 43 cutover (needed to validate 50% reduction criterion)
- Address out-of-scope pre-existing TSC/vitest failures noted in `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md`

### Blockers/Concerns

- Batches API latency (minutes to hours) may exceed 15-min Vercel cron window — spike required before Phase 44-02 commits
- Merged prompt quality regression risk — side-by-side eval on 20-article fixture is the Phase 43 gate before cutover
- basemap subdomain round-robin still at single 'maps' subdomain after maps1–4 NXDOMAIN — monitor whether basemap.at restores them (carry-over from v3.1)
- ROADMAP/REQUIREMENTS plan checkboxes drift on plan completion (recurring cosmetic issue across v2.0, v3.0, v3.1) — low priority

## Session Continuity

Last session: 2026-05-11T11:43:44.242Z
Stopped at: Completed 43-02-PLAN.md (source-typed extractors)
Resume with: `/gsd:execute-plan 43-03` (next plan: wire extractArticleText into pipeline.ts)
