---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 5
status: "46-00 + 46-01 + 46-02 SHIPPED (and 46-04 in parallel). Foundation in place: mapgen.uploadToBlob pathPrefix option (46-00), Phase 46 design tokens (46-00), Doctor model + additive migration (DIR-01/02), doctors.ts read-only DAL with duck-typed DI (DIR-03), doctors-actions.ts Server-Action-Trinity (DIR-04/05/09), public list+detail pages (DIR-07/08/10 via parallel-track 46-04). v3.2 work parked."
stopped_at: "Completed 46-03-PLAN.md (Admin CRUD UI: 6 files, 3 tasks incl. checkpoint, ~40 min wall-clock; Doctor table migration deployed to Neon out-of-band). Plan 46-05 (sitemap + AppBar/Footer Ärzte-link + smoke checkpoint) is the only remaining plan in Phase 46."
last_updated: "2026-05-14T13:48:40.123Z"
last_activity: 2026-05-14
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 14
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** v3.3 Directory Expansion — adding a public doctor directory under `/aerzte` with editorial admin CRUD, map pins, editorial notes and verification badges. Phase 46 is freshly discussed (CONTEXT.md + phase-local DESIGN.md drafted on 2026-05-14). v3.2 work is parked: Phase 43 closed, 44-04 deployed, 44-01/02/03 + Phase 45 remain DEFERRED. The v3.2 ≥50% input-token reduction success criterion remains NOT met — explicitly deferred to a future model-class re-evaluation.

## Current Position

Milestone: v3.3 Directory Expansion (scaffolded 2026-05-14, executing)
Phase: 46 — Ärzteverzeichnis (Doctor Directory)
Current Plan: 5
Total Plans in Phase: 6 (46-00 through 46-05)
Status: 46-00 + 46-01 + 46-02 SHIPPED (and 46-04 in parallel). Foundation in place: mapgen.uploadToBlob pathPrefix option (46-00), Phase 46 design tokens (46-00), Doctor model + additive migration (DIR-01/02), doctors.ts read-only DAL with duck-typed DI (DIR-03), doctors-actions.ts Server-Action-Trinity (DIR-04/05/09), public list+detail pages (DIR-07/08/10 via parallel-track 46-04). v3.2 work parked.
Last activity: 2026-05-14

```
v3.3 Progress: [████████░░] ~79% — Phase 46 Plans 00/01/02/04 of 6 complete
```

**Parked from v3.2 (carried forward, untouched here):**
- Phase 44 Plan 04 ✅ deployed + verified in prod 2026-05-12
- Phase 44 Plans 01/02/03 DEFERRED pending replan with legacy-is-live context
- Phase 45 (REVIEW Heuristic & Quality Loop) not started
- v3.2 ≥50% input-token reduction success criterion NOT met — explicitly deferred

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
| Phase 46-aerzteverzeichnis P00 | 7 min | 2 tasks | 3 files |
| Phase 46 P01 | 7 min | 4 tasks | 5 files |
| Phase 46-aerzteverzeichnis P04 | 4 min | 3 tasks | 7 files |
| Phase 46-aerzteverzeichnis P02 | 7 min | 3 tasks | 2 files |
| Phase 46-aerzteverzeichnis P03 | 40 min | 3 tasks | 6 files |

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
- [Phase 46-aerzteverzeichnis]: Use `||` (not `??`) for pathPrefix fallback in mapgen.uploadToBlob so empty string ALSO falls back to 'article' — JS default-param would let '' produce broken path `maps/-{id}.jpg`
- [Phase 46-aerzteverzeichnis]: Phase-local design tokens land in same `@theme` block as master tokens (`--*-dir-*` namespace) — Tailwind v4 only generates utilities from tokens inside @theme; separate :root or @layer would not produce bg-dir-*/rounded-dir-*
- [Phase 46-aerzteverzeichnis]: Full Material 3 token surface added (47 colors incl. secondary-fixed/tertiary-fixed), not subset — DESIGN.md YAML authoritative; future polish phases can use any M3 token without re-editing globals.css
- [Phase 46]: Doctor.publicId is non-null String (vs Article.publicId nullable) — public detail URL requires it from row birth; Prisma @default(nanoid()) runs client-side, so migration SQL emits no server-side default
- [Phase 46]: Doctor.bezirkId FK uses ON DELETE RESTRICT — Bezirke cannot be deleted while doctors reference them, requires explicit migration if a Bezirk ever needs decommissioning
- [Phase 46]: Doctor DAL is read-only (listDoctors/getDoctorByPublicId/getDoctorById); write paths (create/update/softDelete/toggleVerified) live in doctors-actions.ts per Plan 46-02 — same shape as articles.ts vs articles-actions.ts
- [Phase 46-aerzteverzeichnis]: BASE_URL in /aerzte detail page is character-for-character identical to src/app/sitemap.ts:10 (no www. prefix) — single source of truth for canonical host — Article detail page (artikel/[publicId]/[slug]/page.tsx:19) uses 'www.lodenundleute.at' which is a pre-existing drift; aerzte plan deliberately matches sitemap.ts so detail metadata, JSON-LD, and sitemap entries all resolve to the same host
- [Phase 46-aerzteverzeichnis]: Optional JSON-LD keys (geo, medicalSpecialty, email, telephone, sameAs) are OMITTED not nulled when source values are missing — keeps the schema.org payload minimal and avoids 'null' showing up as a schema value — Schema.org consumers (Google Rich Results, Bing) treat absent keys correctly; explicit null can trigger validation warnings. Pattern matches the conditional emit in the article JSON-LD.
- [Phase 46-aerzteverzeichnis]: Related-article lookups on the doctor detail page use getArticleByPublicId(id).catch(() => null) + filter(non-null) — resilient when a referenced article is unpublished/deleted — Editorial relatedArticleIds is a manual list maintained by the admin; a single missing reference must not break the entire detail render. No try/catch in the page body per AGENTS.md; the .catch() is per-promise inside the Promise.all map call.
- [Phase 46-aerzteverzeichnis]: Two-phase create for Doctor (insert null-geo → geocode + mapgen with stable id → update) — generateMapImage Blob path is keyed on doctor.id, only known after insert; alternative nanoid path rejected for consistency with Plan 46-00 numeric-id signature
- [Phase 46-aerzteverzeichnis]: softDeleteDoctor is a HARD delete — Doctor has no status enum (DIR-01); naming kept for API symmetry with articles' softDelete (status=REJECTED) but operation is db.doctor.delete
- [Phase 46-aerzteverzeichnis]: updateDoctor re-geocodes only when input.address !== prev.address — avoids gratuitous Nominatim 1 req/s rate-limit hits on non-address edits; prev-row read is one indexed lookup
- [Phase 46-aerzteverzeichnis]: Test pattern: positional mock.calls[N][i] assertions instead of toHaveBeenCalledWith(prismaClient, ...) — Vitest deep-equality blows the stack on PrismaClient's circular references; positional indexing is equally precise
- [Phase 46-aerzteverzeichnis]: Admin delete confirm uses JS-less <details> two-step disclosure (no client boundary) — DoctorRow stays a Server Component — Single destructive button does not warrant a 'use client' boundary; <details>/<summary> gives a native, accessible two-click confirm that wraps the Server Action form. Re-usable pattern for future admin rows.
- [Phase 46-aerzteverzeichnis]: Admin pages under (admin)/* do NOT call requireAuth() — layout gates the route group — src/app/(admin)/layout.tsx already does verifySessionCookie + redirect('/admin/login') for every child route; per-page requireAuth() would be duplicate and risks drift. Empirically confirmed in checkpoint Step 7 (incognito visits to /admin/aerzte/new and /admin/aerzte/[id]/edit redirect to /admin/login).
- [Phase 46-aerzteverzeichnis]: Shared DoctorForm is a Server Component (no 'use client') with formAction prop binding the correct Server Action for /new vs /[id]/edit — Uncontrolled fields with defaultValue cover the edit case; passing the Server Action function as a prop keeps the form JSX identical across both routes. Avoids a client boundary for a form that has no client-side interactive state.

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

Last session: 2026-05-14T13:48:40.120Z
Stopped at: Completed 46-03-PLAN.md (Admin CRUD UI: 6 files, 3 tasks incl. checkpoint, ~40 min wall-clock; Doctor table migration deployed to Neon out-of-band). Plan 46-05 (sitemap + AppBar/Footer Ärzte-link + smoke checkpoint) is the only remaining plan in Phase 46.

Resume with one of:
1) **Plan Phase 46** — `/gsd:plan-phase 46` resolves the 9 open questions in CONTEXT.md (felder-vollkatalog, map-engine, suche-modus, JSON-LD, sortierung, bulk-import, AppBar-link, sitemap, token-prefix) and breaks the work into plans.
2) **Research Phase 46** — `/gsd:research-phase 46` if Nominatim-rate-limit or Leaflet-bundle-size needs spiking before plan.
3) **Update ROADMAP.md** — add v3.3 Directory Expansion entry under the milestones list. Currently not yet done — STATE.md leads, ROADMAP.md follows.
4) **Resume v3.2 parked work** — `/gsd:plan-phase 44` (replan 44-01/02/03 with legacy-is-live context) or `/gsd:plan-phase 45` (REVIEW Heuristic & Quality Loop).
5) **Continue ad-hoc UI iteration** — outside GSD; recent: Bright & Modern mockup, freigestellt mascot asset, clip-path fix, WeatherWidget umlaut fix.

Carry-over artifacts (still relevant, untouched):
- `/tmp/baseline.json`, `/tmp/baseline-post-rollback.json` — PipelineRun history from v3.2
- `/tmp/replay-v3-cutover-fail.log`, `/tmp/replay-iter1..4*.log` — merged-prompt tuning harness runs
- `/tmp/baseline-query.ts`, `/tmp/aipl-10-sql.ts`, `/tmp/verify-source-schema.ts`, `/tmp/verify-44-04-features.ts`, `/tmp/inspect-migrations.ts`, `/tmp/check-idx.ts`, `/tmp/bezirke-q.ts` — one-off DB-inspection scripts (kept for reproducibility, not committed)
