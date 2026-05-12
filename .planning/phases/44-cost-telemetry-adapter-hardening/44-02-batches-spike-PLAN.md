---
phase: 44-cost-telemetry-adapter-hardening
plan: 44-02
type: execute
wave: 2
depends_on: ["44-01"]
files_modified:
  - scripts/batches-latency-spike.ts
  - .planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv
  - .planning/phases/44-cost-telemetry-adapter-hardening/44-02-batches-spike-PLAN.md
  - PROGRESS.md
autonomous: false
requirements: []

must_haves:
  truths:
    - "Operator can run a one-shot Node/tsx script that submits a representative payload to the Anthropic Message Batches API and measures wall-clock submit→complete latency on Haiku 4.5"
    - "The script writes a CSV with one row per batch run (run_id, submitted_at, completed_at, wall_clock_seconds, n_requests, n_succeeded, n_errored) that goes into the phase plan directory"
    - "Plan 44-02 captures the empirical p50/p95 latency over ≥5 runs, and a clear pass/fail decision against the 15-min Vercel cron-window threshold, before 44-03 starts"
  artifacts:
    - path: "scripts/batches-latency-spike.ts"
      provides: "One-shot tsx script — submits 20 fixture-derived merged-call batches, polls every 30s until ended, writes CSV"
      min_lines: 80
      contains: "client.messages.batches.create"
    - path: ".planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv"
      provides: "Operator-collected wall-clock data from ≥5 spike runs"
      contains: "run_id,submitted_at,completed_at"
  key_links:
    - from: "scripts/batches-latency-spike.ts"
      to: "src/test/fixtures/ai-merged/"
      via: "readdir + readFile of the 20 existing Phase 43 fixtures; constructs the merged-call request shape (tools + tool_choice + cache_control) verbatim from src/lib/ai/steps/merged.ts"
      pattern: "src/test/fixtures/ai-merged"
    - from: "scripts/batches-latency-spike.ts"
      to: ".planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv"
      via: "appendFile (writes one CSV row per run; idempotent — operator runs 5+ times)"
      pattern: "44-02-spike-results"
---

> **⚠️ DEFERRED — 2026-05-12 (post v3.2 merged-call closure)**
>
> This plan spike-tests Anthropic Message Batches latency for the *merged-call*
> request shape. As of 2026-05-12 merged-call is shelved indefinitely
> (DECISIONS.md closure entry). With merged-call dormant, the business case
> for Batches changes: wrapping the *legacy* two-step path in Batches doubles
> the entry count per batch (2 calls × N articles) and the original "merged +
> Batches = ~75% cost reduction" rationale becomes "legacy + Batches = ~50%
> only, on a 2× larger batch shape".
>
> **Action before executing:** re-evaluate via `/gsd:plan-phase` whether
> Batches is still in scope at all post-closure. If yes, redo the spike
> against the legacy request shape (or both shapes); if no, drop 44-02/03
> from Phase 44 entirely and re-scope the phase.
>
> Do NOT run `/gsd:execute-phase 44` against this plan as drafted.

---

<objective>
Empirically measure Anthropic Message Batches API round-trip latency on Haiku 4.5 against a production-like 20-article payload. The single output is a decision: does p50 wall-clock fit inside the 15-minute Vercel cron window?

Purpose: 44-03 has two diametrically opposed implementation paths (ship batches as default vs feature-flag-only fallback). The decision pivots on a single empirical number that cannot be guessed — Anthropic's docs say "most batches complete in under 1 hour" without committing to a tighter bound. We measure.

**Critical constraint: NO production code changes in this plan.** The spike script writes nothing to the database, imports no Prisma client, and lives outside `src/`. Its only side effects are: (a) real Anthropic API calls (~20 messages per run × 5 runs = ~100 messages, ~$0.50 actual cost at batch pricing), (b) appends to a CSV inside the plan directory.

Output: A new `scripts/batches-latency-spike.ts` + an operator-collected CSV + a "Spike Results" section appended to this very plan file with the verdict.
</objective>

<execution_context>
@/Users/philipp/.claude/get-shit-done/workflows/execute-plan.md
@/Users/philipp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-CONTEXT.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-RESEARCH.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-VALIDATION.md
@AGENTS.md
@src/lib/ai/steps/merged.ts
@scripts/ai-replay-fixtures.ts

<interfaces>
<!-- Reference shapes from existing code; spike script MUST import nothing from src/lib/ai/. -->
<!-- Replicate the merged-call request shape locally to keep the spike isolated -->

From src/lib/ai/steps/merged.ts (the request shape to replicate inline in spike script):
```typescript
// MERGED_OUTPUT_SCHEMA is the input_schema for the 'publish_article' tool.
// Spike script can use a SIMPLIFIED schema (single tool, one required string) —
// the goal is to measure batch latency, not output quality. Hardcode a minimal
// equivalent so the spike has no import from src/.
```

From src/test/fixtures/ai-merged/ (existing 20 fixtures from Phase 43-04):
```
f01-graz-traffic-single-bezirk.json ... f20-leibnitz-rss-summary-only.json
Each: { id, description, sourceType, rawArticleText, expectedOutput, contentInvariants }
Only `rawArticleText` is needed for the spike — it becomes the user-content of each batch request.
```

From research § Submit a batch (code example, replicate):
```typescript
const requests = articles.map((article) => ({
  custom_id: `article-${article.id}`,
  params: {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: [
      { type: 'text', text: STATIC_PREFIX, cache_control: { type: 'ephemeral', ttl: '1h' } },
      { type: 'text', text: DYNAMIC_SUFFIX },
    ],
    messages: [{ role: 'user', content: article.rawArticleText }],
    tools: [{ name: 'publish_article', input_schema: MINIMAL_SCHEMA }],
    tool_choice: { type: 'tool', name: 'publish_article' },
  },
}))
const batch = await client.messages.batches.create({ requests })
// Then poll: const status = await client.messages.batches.retrieve(batch.id); status.processing_status === 'ended'
```

Poll cadence: 30s (research-recommended, balances API call count vs latency precision).
Pass threshold: p50 ≤ 900 seconds (= 15 min Vercel cron window). p95 informational only.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: feat(44-02): write isolated batches-latency-spike.ts script</name>
  <files>scripts/batches-latency-spike.ts</files>
  <action>
    1. **Create `scripts/batches-latency-spike.ts`** as a one-shot Node/tsx script:
       - Shebang: `#!/usr/bin/env tsx`
       - Imports: `Anthropic from '@anthropic-ai/sdk'`, `readdir/readFile/appendFile from 'node:fs/promises'`, `join from 'node:path'`. **No imports from `src/`. No Prisma. No DB.**
       - Read `ANTHROPIC_API_KEY` from env; exit 1 with clear error if missing.
       - Set `FIXTURE_DIR = 'src/test/fixtures/ai-merged'`. List files matching `f*.json` (filter out README.md). Read each as JSON; extract `rawArticleText`.
       - Define inline:
         ```typescript
         const STATIC_PREFIX = `Du bist ein Redakteur für hyperlokale Steiermark-Nachrichten. Schreibe sachlich, korrekt, knapp.`
         const DYNAMIC_SUFFIX = `Tone: neutral. Length: medium.`
         const MINIMAL_SCHEMA = {
           type: 'object',
           properties: {
             headline: { type: 'string', description: 'Überschrift.' },
             body: { type: 'string', description: 'Artikeltext.' },
           },
           required: ['headline', 'body'],
         } as const
         ```
       - Build `requests` array (one per fixture, ~20 total):
         ```typescript
         const requests = fixtures.map((fx, idx) => ({
           custom_id: `spike-${idx}-${fx.id}`,
           params: {
             model: 'claude-haiku-4-5-20251001',
             max_tokens: 1024,
             system: [
               { type: 'text' as const, text: STATIC_PREFIX, cache_control: { type: 'ephemeral' as const, ttl: '1h' as const } },
               { type: 'text' as const, text: DYNAMIC_SUFFIX },
             ],
             messages: [{ role: 'user' as const, content: fx.rawArticleText }],
             tools: [{ name: 'publish_article', description: 'Publish a rewritten article.', input_schema: MINIMAL_SCHEMA }],
             tool_choice: { type: 'tool' as const, name: 'publish_article' },
           },
         }))
         ```
       - **Submit**: `const submittedAt = Date.now(); const batch = await client.messages.batches.create({ requests }); console.log(\`[spike] submitted batch=\${batch.id} n=\${requests.length}\`)`.
       - **Poll** every 30s until `processing_status === 'ended'`:
         ```typescript
         let polled
         do {
           await new Promise((r) => setTimeout(r, 30_000))
           polled = await client.messages.batches.retrieve(batch.id)
           console.log(\`[spike] status=\${polled.processing_status} elapsed=\${Math.round((Date.now()-submittedAt)/1000)}s\`)
         } while (polled.processing_status !== 'ended')
         const completedAt = Date.now()
         ```
       - **Hard-cap poll loop at 30 minutes** (max 60 iterations of 30s) so a stuck spike doesn't hang the operator's terminal indefinitely. If hit, log `[spike] TIMEOUT after 30min — exiting with FAIL row`.
       - **Count outcomes**: stream `client.messages.batches.results(batch.id)` async iterator; count `succeeded`, `errored`. (Don't apply results — this is a spike.)
       - **Append CSV row** to `.planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv`:
         ```
         run_id,submitted_at,completed_at,wall_clock_seconds,n_requests,n_succeeded,n_errored,timed_out
         ```
         Create file with header if not exists; otherwise append. `run_id` = current timestamp (`new Date().toISOString()`). Use `appendFile`.
       - **Print summary** to stdout: `wall_clock_seconds`, `succeeded/errored counts`, "PASS" if ≤900s else "FAIL". Exit 0 either way (operator decides).

    2. **try/catch scope:** only around the SDK calls (`batches.create`, `batches.retrieve`, `batches.results`) — known error case is network/rate-limit/auth. Per AGENTS.md, no try/catch around `JSON.parse` of fixtures (operator-controlled input, throwing is the correct behavior). No try/catch around fs ops (operator-controlled paths).

    3. **No new npm deps.** `@anthropic-ai/sdk` is already installed (Phase 43). `tsx` runs the file directly (`npx tsx scripts/batches-latency-spike.ts`).

    4. **Documentation comment at top of file** explains:
       - This is a one-shot measurement script for Phase 44-02
       - It writes NOTHING to the database
       - It uses ~$0.50 of Anthropic credit per run at batch pricing
       - Operator runs ≥5 times across different times of day; pastes summary into 44-02-PLAN.md § Spike Results

    Why per requirement: Phase gate (spike result decides 44-03 dominant path). Critical: must NOT contaminate production DB (research pitfall #6).
  </action>
  <verify>
    <automated>npx tsc --noEmit scripts/batches-latency-spike.ts</automated>
  </verify>
  <done>
    File exists, TSC-clean, no `src/` imports, no Prisma import (`grep -E "from '../src|prisma|@prisma" scripts/batches-latency-spike.ts` returns nothing). Conventional commit: `feat(44-02): add batches-latency-spike script`.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: chore(44-02): operator runs spike ≥5 times and records results</name>
  <files>.planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv, .planning/phases/44-cost-telemetry-adapter-hardening/44-02-batches-spike-PLAN.md</files>
  <action>
    **THIS IS THE ONE TRULY MANUAL TASK IN PHASE 44.** Claude cannot run real Anthropic API calls against a paid key autonomously — operator must execute the spike script and paste the verdict.

    Operator steps:
    1. Ensure `ANTHROPIC_API_KEY` is set in the shell (matches your prod key — billing will reflect ~$0.50/run at batch pricing).
    2. Run `npx tsx scripts/batches-latency-spike.ts` once. Wait for completion (up to 30min hard cap). Verify CSV row appended at `.planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv`.
    3. Repeat ≥4 more times, ideally at different times of day (morning, midday, evening, late evening, weekend). Each run appends a new CSV row.
    4. Open the CSV in a spreadsheet (or just `cat`). Compute p50 and p95 of `wall_clock_seconds` across all rows.
    5. **Append a § Spike Results section to THIS file (`44-02-batches-spike-PLAN.md`)** using the template below.
    6. Commit the CSV + the updated plan file and mark this checkpoint resolved.

    Spike Results template (append to bottom of this plan file verbatim, then fill in):
    ```
    ## Spike Results

    **Runs collected:** N (N ≥ 5)
    **Wall-clock seconds (sorted):** [s1, s2, ..., sN]
    **p50:** XXX seconds
    **p95:** YYY seconds
    **Threshold:** 900s (15min Vercel cron window)
    **Verdict:** PASS / FAIL

    **If PASS:** 44-03 dominant path is "ship batches as default, AI_USE_BATCHES env var default 'true'".
    **If FAIL:** 44-03 dominant path is "ship BATCHED enum + code behind AI_USE_BATCHES='false' default; also ship p-limit(4) concurrency on per-article path per manifest B6".

    **n_errored across runs:** total Z (expect 0; >0 invalidates the spike — investigate).
    **Notes (anomalies, time-of-day patterns, etc.):**
    ```

    Why manual: paid API key + multi-hour elapsed time per run + judgment call on outliers — no CLI/API equivalent exists for "run this 5 times across different times of day and assess the distribution".
  </action>
  <verify>
    <manual>(1) `wc -l .planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv` shows ≥6 lines (header + 5 data rows). (2) `grep "## Spike Results" .planning/phases/44-cost-telemetry-adapter-hardening/44-02-batches-spike-PLAN.md` returns one match. (3) The Verdict line in that section is unambiguously PASS or FAIL.</manual>
  </verify>
  <resume-signal>Operator types "spike pasted" once the § Spike Results section is filled in and committed to git.</resume-signal>
  <done>
    The CSV exists with ≥5 rows, the § Spike Results section is filled in this plan file, and the verdict (PASS/FAIL) is unambiguous. Conventional commit: `chore(44-02): record batches latency spike results (N runs, p50=XXXs, verdict=...)`.
  </done>
</task>

</tasks>

<verification>
- `scripts/batches-latency-spike.ts` exists and is TSC-clean
- `.planning/phases/44-cost-telemetry-adapter-hardening/44-02-spike-results.csv` exists with ≥5 data rows
- § Spike Results section appended to this plan file with explicit PASS/FAIL verdict
- PROGRESS.md updated with both commits
- 44-03 plan will read the verdict and follow the corresponding implementation path
</verification>

<success_criteria>
- Script is fully isolated (no imports from `src/`, no Prisma)
- ≥5 spike runs recorded
- Verdict is explicit (PASS = batches default, FAIL = batches flag-only + p-limit fallback)
</success_criteria>

<output>
After completion, create `.planning/phases/44-cost-telemetry-adapter-hardening/44-02-SUMMARY.md` per `~/.claude/get-shit-done/templates/summary.md`. Include: the verdict, raw p50/p95 numbers, n_errored total, time-of-day notes, and link to the CSV file path.
</output>
