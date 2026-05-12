---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: "4 harness iterations explored (Haiku 9→10→7→7, Sonnet 16/20). Closed: Haiku model-capability limits, Sonnet defeats cost target. Production on legacy Haiku stays. v3.2 success criterion ≥50% input-token reduction NOT met — explicitly deferred."
stopped_at: "44-04 deployed + verified in prod (BMI RSS 19 items, Source.lastFetchedAt/etag/lastModified populated). Accept-header regression caught + fixed mid-rollout."
last_updated: "2026-05-12T19:10:00.000Z"
last_activity: 2026-05-12 — 48 commits pushed to origin/main; Prisma migrate-resolve on stale 20260401_add_article_theme + migrate deploy of 20260514_phase44_source_cursor; Accept-header regression (BMI 302) caught and fixed in 21ade92; cron run 21:08 CEST green
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 8
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** v3.2 Text Engine Optimization — Phase 43 plans complete; cutover gate FAILED + ROLLED BACK; merged-call tuning explored across 4 harness iterations and CLOSED as "infeasible with Haiku 4.5 + cost target". Production on legacy two-step Haiku path (Vercel `AI_USE_MERGED_CALL=false`, verified on run #53). Merged-call code dormant in tree (commits 25007cc, 27bc1f3, 6a0c63f). The v3.2 ≥50% input-token reduction success criterion is NOT met and is explicitly deferred — next attempt should follow Phase 44 telemetry + Phase 45 quality-eval loop + a model-class re-evaluation.

## Current Position

Phase: 44 — Cost Telemetry & Adapter Hardening (44-04 ✅ deployed + verified; 44-01/02/03 DEFERRED pending replan)
Plan: 44-04 closed + verified in prod 2026-05-12
Status: 48 commits live on origin/main; migration applied to Neon; BMI RSS cron green with cursor + conditional GET populated. v3.2 success criterion ≥50% input-token reduction remains NOT met — explicitly deferred. 44-04 is the only Phase 44 plan actually shipped.
Last activity: 2026-05-12 21:08 CEST — verification cron HTTP 200, `found=19 new=1`, Source 3 lastFetchedAt/etag/lastModified persisted

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
| Phase 44 P04 | 20min | 4 tasks | 11 files |

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
- [Phase 44]: 44-04: Option A — unified AdapterResult envelope for all adapters; OTS sets etag/lastModified=null (tri-state skip). Keeps ingest.ts as single transaction site.
- [Phase 44]: 44-04: Tri-state etag/lastModified semantics — null=no support, undefined=304 preserve, string=200 persist. Mapped to Prisma via conditional spread of update payload.
- [Phase 44]: 44-04: Proxy-wrap PrismaClient in tests when vi.spyOn can't see $-methods — Prisma client is a Proxy with value:undefined descriptors until accessed. Pattern reusable for future transactional tests.
- [Phase 44]: 44-04 post-deploy: drop Accept header from rssAdapter. BMI's myracloud-fronted feed (https://www.bmi.gv.at/rss/stmk_presse.xml) 302-redirects to an error page when the request advertises `Accept: application/rss+xml, application/atom+xml, application/xml` — server serves text/xml and its content-negotiator does not recognize the canonical RSS media types. Trust the server's default. Commit 21ade92.
- [Deploy]: prisma migrate deploy can fail to bootstrap when an earlier migration was applied via `prisma db push` (Article.theme case from v3.1). Recovery path: `prisma migrate resolve --applied <migration-name>` after verifying the schema state matches the migration's intent (column + index both already present), then `prisma migrate deploy` runs the remaining pending migrations cleanly. Pattern reusable if future db-push debt surfaces.

### Pending Todos

- **v3.2 ROADMAP success-criterion revision:** the ≥50% input-token reduction goal needs to be marked as "deferred" or "not achieved with current model class" — separate edit to `.planning/PROJECT.md` and roadmap docs after this session's closure.
- **Replan 44-01/02/03** via `/gsd:plan-phase` with legacy-is-live context. Plans currently have DEFERRED admonitions explaining the conflict with v3.2 closure. Until replanned, Phase 44 is partial.
- **Add `prisma migrate deploy` to Vercel build script** so future migrations apply automatically on push instead of requiring manual local invocation. One-line `package.json` change: `"build": "prisma migrate deploy && next build"`. Track as separate task to avoid coupling to bigger changes.
- **Phase 44 telemetry schema (TLM-01..04)** must log both legacy and merged paths, so future re-cutover attempts have native cost telemetry. Decision recorded in DECISIONS.md 2026-05-12 closure entry.
- **Phase 45 quality-eval harness** should generalize from the 20-fixture corpus and bake in `AI_MODEL_OVERRIDE` for model-comparison runs (the env-var hook now exists in merged.ts).
- **Cron-Runbook-Korrektur:** `43-04-SUMMARY.md` Step 1 dokumentiert `curl -X POST /api/cron` — Route akzeptiert nur GET (Vercel-Cron-Konvention). Manuell-Trigger-Beispiel auf GET ändern.
- Spike-test Anthropic Message Batches API round-trip latency before committing to it as default in Phase 44 (15-min cron window constraint).
- Phase 44 telemetry schema (TLM-01..04) should be designed to log both legacy and merged paths so future cutover attempts have native cost telemetry, not historical aggregates.
- Address out-of-scope pre-existing TSC/vitest failures noted in `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md` (bezirke.test.ts CONF-02 data drift, root-layout-adsense.test.ts Plus_Jakarta_Sans, mapgen.test.ts ArrayBuffer/SharedArrayBuffer post-Node24, map-actions.test.ts afterEach import).

### Blockers/Concerns

- **Phase 43 cutover gate FAILED + merged-call tuning CLOSED 2026-05-12.** Production safe on legacy Haiku. Three Haiku prompt iterations (9/10/7/7) + Sonnet 4.6 experiment (16/20) established that the v3.2 ≥50% reduction goal is structurally incompatible with adequate fact-preservation on Haiku 4.5. Sonnet hits the quality bar but defeats the cost goal (5x cost/token). Closure recorded in DECISIONS.md 2026-05-12 closure entry. Re-attempt later needs model-class re-evaluation + Phase 44 telemetry + Phase 45 quality-loop.
- **Anthropic prompt cache structurally useless under Vercel-Hobby 1/day cron** — cache TTL is 5 min, so every cron start is cold. The ≥50% input-token reduction target on v3.2 ROADMAP may be unreachable without either (a) more frequent cron (Pro plan) or (b) the cache architecture redesigned to write to a longer-lived medium. Document this constraint in v3.2 retrospective.
- Batches API latency (minutes to hours) may exceed 15-min Vercel cron window — spike required before Phase 44-02 commits
- basemap subdomain round-robin still at single 'maps' subdomain after maps1–4 NXDOMAIN — monitor whether basemap.at restores them (carry-over from v3.1)
- ROADMAP/REQUIREMENTS plan checkboxes drift on plan completion (recurring cosmetic issue across v2.0, v3.0, v3.1) — low priority

## Session Continuity

Last session: 2026-05-12T19:10:00Z
Stopped at: 44-04 deployed + verified in prod (HTTP 200, BMI RSS 19 items, Source.lastFetchedAt/etag/lastModified populated). 48 commits live on origin/main. Accept-header regression caught + fixed mid-rollout (commit 21ade92).
Resume with one of:
1) **Replan 44-01/02/03** via `/gsd:plan-phase` with legacy-is-live context (DEFERRED admonitions in each PLAN.md explain the gap).
2) **Close v3.2 milestone** — revise PROJECT.md + ROADMAP.md to mark the ≥50% reduction success criterion as "deferred"; archive Phase 43 + partial Phase 44 via `/gsd:audit-milestone` + `/gsd:complete-milestone`; set up v3.3 for the AI cost work.
3) **Build-script fix** — add `prisma migrate deploy` to the Vercel build command so future migrations land automatically.
4) **Cosmetic cleanups** — cron-runbook GET-vs-POST in 43-04-SUMMARY.md.

Artifacts from this session:
- `/tmp/baseline.json`, `/tmp/baseline-post-rollback.json` — PipelineRun history
- `/tmp/replay-v3-cutover-fail.log`, `/tmp/replay-iter1..4*.log` — merged-prompt tuning harness runs
- `/tmp/baseline-query.ts`, `/tmp/aipl-10-sql.ts`, `/tmp/verify-source-schema.ts`, `/tmp/verify-44-04-features.ts`, `/tmp/inspect-migrations.ts`, `/tmp/check-idx.ts`, `/tmp/bezirke-q.ts` — one-off DB-inspection scripts (kept for reproducibility, not committed)
