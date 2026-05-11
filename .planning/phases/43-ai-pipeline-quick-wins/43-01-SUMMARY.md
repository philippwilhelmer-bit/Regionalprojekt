---
phase: 43-ai-pipeline-quick-wins
plan: 01
subsystem: ai
tags: [anthropic, tool-use, prompt-caching, structured-output, vitest, tdd]

# Dependency graph
requires:
  - phase: 06-ai-tagging
    provides: step1-tag.ts buildBezirkContext format (replicated verbatim, not imported)
  - phase: 10-ai-config
    provides: getResolvedAiConfig + ResolvedAiConfig for per-source tone/length/styleNotes
provides:
  - runMergedCall — single tool_use Anthropic call returning the 8-field MergedResult
  - MergedResult / BezirkInput / buildBezirkList / buildStaticPrefix / buildDynamicSuffix exports
  - Cache-aware token split (inputTokens / cachedInputTokens / cacheCreationTokens / outputTokens)
  - Defensive isStateWide → bezirkSlugs=[] guard at the schema boundary
  - Vitest scaffold (TEST_BEZIRKE, VALID_TOOL_INPUT, makeToolUseBlock, makeMockClient, makeMockDb)
affects: [43-02-prompt-caching-verification, 43-03-pipeline-integration, 43-04-cutover, 44-telemetry, 45-quality-eval]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — uses already-installed @anthropic-ai/sdk@^0.80.0
  patterns:
    - "Two-block system prompt — `[{type:'text', text:staticPrefix, cache_control:{type:'ephemeral'}}, {type:'text', text:dynamicSuffix}]`"
    - "Tool-use over JSON-schema output_config — typed access to `tool_use.input`, no `as any`"
    - "Schema typing via `satisfies Anthropic.Messages.Tool.InputSchema` (keeps narrow object inference while constraining shape)"
    - "Cache-aware token accounting — `inputTokens` (fresh), `cachedInputTokens` (cache reads), `cacheCreationTokens` (cache writes), `outputTokens`"
    - "Schema-boundary defensive guard — `cleanBezirkSlugs = parsed.isStateWide ? [] : parsed.bezirkSlugs`"

key-files:
  created:
    - "src/lib/ai/steps/merged.ts (281 lines)"
    - "src/lib/ai/steps/merged.test.ts (241 lines)"
  modified: []

key-decisions:
  - "Replicate `buildBezirkContext` format from step1-tag.ts verbatim rather than import — isolates merged.ts so step1-tag.ts can be deleted in v3.3 without touching this file"
  - "Use `satisfies Anthropic.Messages.Tool.InputSchema` instead of `as const` on MERGED_OUTPUT_SCHEMA — SDK's `InputSchema.required` is a mutable `Array<string>`, so `as const` would have required a cast that contradicts the AIPL-02 invariant"
  - "Loosened test override `content` type to `Array<Record<string, unknown>>` — SDK's ContentBlock union now requires a `caller` field that intentional duck-typed mocks omit; the runtime code reads only `b.type` and `b.name`"
  - "Defensive `isStateWide → bezirkSlugs=[]` guard lives in merged.ts (not in the pipeline) — keeps the contract clean at the schema boundary; pipeline-side warning logging lives in Plan 43-03's integration"

patterns-established:
  - "Cache-aware single-call pattern — any future LLM-backed structured-output step should follow `static prefix (cached) + dynamic suffix (uncached) + tool_use`"
  - "Test mock factories accept loose `Record<string, unknown>` overrides for SDK content blocks — survives SDK minor version bumps without retyping helpers"

requirements-completed: [AIPL-01, AIPL-02, AIPL-03, AIPL-04, AIPL-05]

# Metrics
duration: 8m22s
completed: 2026-05-11
---

# Phase 43 Plan 01: Merged AI Call (runMergedCall) Summary

**Single typed Anthropic `tool_use` call returning the 8-field merged tagging+writing result, with `cache_control: {type:'ephemeral'}` on the static prefix, `max_tokens: 1024` + truncation guard, defensive `isStateWide` guard, and cache-aware token split — all backed by 12 unit tests against a mocked SDK.**

## Performance

- **Duration:** 8m 22s
- **Started:** 2026-05-11T11:35:53Z
- **Completed:** 2026-05-11T11:44:15Z
- **Tasks:** 2 (1 RED, 1 GREEN; no REFACTOR needed)
- **Files created:** 2 (`merged.ts` 281 lines, `merged.test.ts` 241 lines)

## Accomplishments

- `src/lib/ai/steps/merged.ts` ships `runMergedCall` and its three supporting builders (`buildBezirkList`, `buildStaticPrefix`, `buildDynamicSuffix`), wiring through `getResolvedAiConfig` for per-source `tone` / `articleLength` / `styleNotes` / `modelOverride` resolution.
- The call now returns a fully-typed `MergedResult` from a single `client.messages.create` (was: two calls in step1-tag + step2-write).
- Cache-aware token accounting is end-to-end: `cache_read_input_tokens` and `cache_creation_input_tokens` surface as `cachedInputTokens` and `cacheCreationTokens`, both defaulting to `0` when the SDK omits them.
- The defensive `isStateWide → bezirkSlugs=[]` guard sits at the schema boundary inside `runMergedCall`, so downstream code can rely on the invariant without re-checking.
- `max_tokens: 1024` paired with an explicit `stop_reason === 'max_tokens'` throw means truncated JSON tool input can never silently corrupt downstream data.
- All 12 unit cases pass; the full `src/lib/ai/` suite (9 files, 85 tests) is green.

## Task Commits

1. **Task 1 — Write merged.test.ts (RED)** — `4bb39f6` (test)
   12 cases covering AIPL-01..AIPL-05 invariants. Import of `./merged` fails (as intended) — RED gate.
2. **Task 2 — Implement runMergedCall (GREEN)** — `80e42e0` (feat)
   Full module + builders. All 12 tests turn green; no regressions in step1-tag, step2-write, pipeline, or circuit-breaker tests.

_No REFACTOR commit — the draft was already idiomatic; no obvious cleanup remained after GREEN._

## Files Created/Modified

- `src/lib/ai/steps/merged.ts` (281 lines) — exports `runMergedCall`, `MergedResult`, `BezirkInput`, `buildBezirkList`, `buildStaticPrefix`, `buildDynamicSuffix`.
- `src/lib/ai/steps/merged.test.ts` (241 lines) — 12 unit cases against a mocked Anthropic client and duck-typed PrismaClient.

## Interfaces (downstream contract)

For Plan 43-03 (pipeline integration) and beyond:

```typescript
export interface MergedResult {
  // Tagging fields (3)
  bezirkSlugs: string[]            // Empty when isStateWide=true (defensive guard)
  isStateWide: boolean
  mentionsPrivateIndividual: boolean
  // Writing fields (5)
  headline: string
  lead: string
  body: string
  seoTitle: string
  metaDescription: string
  // Token accounting (cache-aware)
  inputTokens: number              // response.usage.input_tokens (fresh, uncached)
  cachedInputTokens: number        // response.usage.cache_read_input_tokens ?? 0
  cacheCreationTokens: number      // response.usage.cache_creation_input_tokens ?? 0
  outputTokens: number             // response.usage.output_tokens
}

export type BezirkInput = { slug: string; name: string; gemeindeSynonyms: string[] }

export async function runMergedCall(
  client: Anthropic,
  articleText: string,
  bezirke: BezirkInput[],
  db: PrismaClient,
  sourceId?: number,
): Promise<MergedResult>

export function buildBezirkList(bezirke: BezirkInput[]): string
export function buildStaticPrefix(bezirkList: string): string
export function buildDynamicSuffix(config: ResolvedAiConfig): string
```

## Decisions Made

- **Schema typing via `satisfies`, not `as const`.** The Anthropic SDK's `Tool.InputSchema.required` is `Array<string> | null` (mutable). `as const` would have required either a downstream cast (forbidden by AIPL-02) or a structural rewrite of `MERGED_OUTPUT_SCHEMA`. `satisfies` keeps the literal-narrow object inference while constraining the shape — and preserves the AIPL-02 invariant verbatim.
- **Replicate `buildBezirkContext` format, do not import.** Per the plan's explicit instruction, `buildBezirkList` lives in `merged.ts` instead of being imported from `step1-tag.ts`. This isolation is deliberate — once Plan 43-04 (cutover) ships, `step1-tag.ts` is deletable without follow-on edits to `merged.ts`.
- **Test mock factory overrides are loosely typed (`Array<Record<string, unknown>>`).** The SDK's `ContentBlock` union (in `@anthropic-ai/sdk@0.80.0`) requires a `caller` field on `ToolUseBlock` that intentional duck-typed mocks omit. The runtime code in `runMergedCall` only reads `b.type` and `b.name`, so a structural mock is sufficient and survives SDK minor version bumps without retyping helpers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replace `as const` with `satisfies Anthropic.Messages.Tool.InputSchema` on MERGED_OUTPUT_SCHEMA**
- **Found during:** Task 2 (GREEN — `npx tsc --noEmit`)
- **Issue:** The draft used `as const` on the schema literal. SDK's `Tool.InputSchema` declares `required?: Array<string> | null` (mutable), so the readonly tuple from `as const` was rejected by both `messages.create` overloads. Adding a cast would have violated AIPL-02 (no `as any` / `as Function`).
- **Fix:** Replaced `} as const` with `} satisfies Anthropic.Messages.Tool.InputSchema`. Keeps the literal-narrow object inference while enforcing the shape and producing a structurally-mutable `required` array.
- **Files modified:** `src/lib/ai/steps/merged.ts`
- **Verification:** `npx tsc --noEmit` reports zero merged-related errors. `grep -n "as any\|as Function\|output_config" src/lib/ai/steps/merged.ts` returns empty.
- **Committed in:** `80e42e0` (Task 2 commit)

**2. [Rule 3 - Blocking] Loosen `content` override type in test's `makeMockClient`**
- **Found during:** Task 2 (GREEN — `npx tsc --noEmit`)
- **Issue:** The draft typed the override as `content?: Anthropic.Messages.ContentBlock[]`. In `@anthropic-ai/sdk@0.80.0`, `ToolUseBlock` requires a `caller: DirectCaller | ServerToolCaller | ServerToolCaller20260120` field that the duck-typed `makeToolUseBlock` helper omits intentionally. TypeScript rejected `makeToolUseBlock(...)` in tests 7 and 8.
- **Fix:** Changed the override shape to `content?: Array<Record<string, unknown>>` with a comment explaining the rationale. Runtime code reads only `b.type` and `b.name`, so the loose mock is faithful.
- **Files modified:** `src/lib/ai/steps/merged.test.ts`
- **Verification:** All 12 tests still pass. `npx tsc --noEmit` is now silent on merged files.
- **Committed in:** `80e42e0` (rolled into Task 2 commit since it's a Task 2 blocker)

**3. [Rule 3 - Blocking] Rephrase doc comment to avoid `output_config` literal**
- **Found during:** Task 2 invariant grep
- **Issue:** A descriptive doc comment in `merged.ts` mentioned the legacy `output_config as any` pattern to explain what the new code replaces. The plan's AIPL-02 invariant grep (`grep -n "as any\|as Function\|output_config"`) does not distinguish code from comments and would have flagged it.
- **Fix:** Rephrased the comment to "replaces the legacy untyped JSON-schema cast used in step1-tag.ts" — same meaning, no banned tokens.
- **Files modified:** `src/lib/ai/steps/merged.ts`
- **Verification:** Invariant grep returns empty.
- **Committed in:** `80e42e0` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 — blocking type / invariant issues during GREEN)
**Impact on plan:** All three were small mechanical adjustments needed to satisfy AIPL-02 (no `as any` / `output_config`) under the current `@anthropic-ai/sdk@0.80.0` types. The draft's behavior is preserved verbatim — no semantic change. No scope creep.

## Issues Encountered

None. The draft was authoritative and complete; the only adjustments were SDK-type-shape compatibility (Rule 3 above).

## Deferred Issues (out of scope)

Pre-existing TypeScript errors in unrelated files, observed during `npx tsc --noEmit` but NOT introduced by this plan. Already logged to `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md`:
- `src/lib/admin/map-actions.test.ts:174` — `afterEach` not imported from vitest
- `src/lib/images/mapgen.test.ts:193` — `ArrayBuffer | SharedArrayBuffer` mismatch (likely post Node 24 upgrade)

These do not block plan completion — neither file is part of the AI pipeline subsystem this plan ships.

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run src/lib/ai/steps/merged.test.ts` | 12/12 pass |
| `npx vitest run src/lib/ai/` | 85/85 pass (9 files) |
| `npx tsc --noEmit` (merged files only) | 0 errors |
| `grep -n "as any\|as Function\|output_config" src/lib/ai/steps/merged.ts` | empty (AIPL-02) |
| `grep -c "cache_control" src/lib/ai/steps/merged.ts` | 3 (≥1, AIPL-04) |
| `grep -n "max_tokens: 1024" src/lib/ai/steps/merged.ts` | exactly one match (AIPL-03) |
| `grep -nc "cache_creation_input_tokens\|cache_read_input_tokens" src/lib/ai/steps/merged.ts` | 4 (≥2, AIPL-05) |
| `prisma/schema.prisma` git diff | empty (zero schema changes) |

## User Setup Required

None — no external service configuration required. The merged call uses the existing `ANTHROPIC_API_KEY` already wired into the pipeline.

## Next Phase Readiness

- **Plan 43-02 (prompt caching verification)** can now import `runMergedCall` and `MergedResult` directly and assert `cache_read_input_tokens > 0` on call 2..N against a real or recorded Anthropic response.
- **Plan 43-03 (pipeline integration)** has a stable typed contract — collapsing the two `runStep1Tag` + `runStep2Write` calls in `src/lib/ai/pipeline.ts` requires no further interface negotiation.
- **No blockers.** Phase 43 stays schema-free as promised.

---
*Phase: 43-ai-pipeline-quick-wins*
*Completed: 2026-05-11*

## Self-Check: PASSED

- `src/lib/ai/steps/merged.ts` exists on disk
- `src/lib/ai/steps/merged.test.ts` exists on disk
- `.planning/phases/43-ai-pipeline-quick-wins/43-01-SUMMARY.md` exists on disk
- Commit `4bb39f6` (Task 1 RED) present in `git log`
- Commit `80e42e0` (Task 2 GREEN) present in `git log`
