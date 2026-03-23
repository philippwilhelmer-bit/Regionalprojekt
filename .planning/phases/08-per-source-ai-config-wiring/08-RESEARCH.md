# Phase 8: Phase 7 Verification + Per-Source AI Config Wiring - Research

**Researched:** 2026-03-23
**Domain:** Prisma schema migration (nullable FK), TypeScript function signature extension, pipeline wiring, pgLite test patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Verification document (07-VERIFICATION.md)**
- Format: Checklist + evidence — each of the 4 Phase 7 success criteria listed as checkmark PASS with a one-line evidence note
- Test reference: Each criterion references the exact `describe()` block name from `src/test/validation.test.ts`
- Test count: Include exact count from running vitest before writing the doc
- Phase 8 executor runs tests first: `npx vitest run` then capture result, then write verification doc with real evidence
- Caveats section titled "Known Limitations" — honest record of what was not proven
- Location: `.planning/phases/07-extensibility-and-quality-validation/07-VERIFICATION.md`
- Audience: Internal project record — technical, terse tone fine

**Article.sourceId schema**
- Add `Article.sourceId Int?` — nullable FK to `Source` table with full Prisma relation
- `onDelete: SetNull` — if a Source is deleted, its articles lose sourceId and fall through to global AI config
- Add reverse relation `Source.articles Article[]` on Source model
- Add `@@index([sourceId])` in Prisma schema
- Keep `Article.source ArticleSource` enum alongside the new FK — removing is out of scope
- Migration: Hand-crafted SQL, timestamp-prefixed directory name, standard non-deferrable FK
- No backfill — existing articles stay `sourceId = NULL`
- `cleanDb()` needs no change

**Ingestion wiring (ingest.ts)**
- Set `Article.sourceId = source.id` on `article.create()`
- Set on create only, not update
- Existing ingest tests unchanged — `sourceId` is nullable so existing calls still compile

**Pipeline wiring (pipeline.ts + runStep2Write)**
- Add optional 5th parameter: `runStep2Write(client, articleText, bezirkNames, db?, sourceId?)`
- `pipeline.ts` reads `article.sourceId` from the already-fetched Article row and passes it to `runStep2Write`
- `runStep2Write` calls `getResolvedAiConfig(db, sourceId ?? undefined)` instead of `getAiConfig(db)`
- Remove the TODO comment in `step2-write.ts`
- Pipeline-internal only — sourceId not exposed in admin list queries or reader queries

**Per-source override test**
- New file: `src/lib/ai/steps/step2-write-source-override.test.ts` (or similar — Claude's discretion on exact name)
- Two test cases: (1) sourceId with AiSourceConfig override → override config used; (2) sourceId = null → global config used
- Uses real pgLite DB via `createTestDb()` and `cleanDb()` from `src/test/setup-db.ts`
- Fake Anthropic client with `messages.create = vi.fn()` returning a canned response
- Assert with `expect.objectContaining({ model: '...' })`
- Source row created inline — minimal `db.source.create()`, not seedSources()
- Existing `step2-write.test.ts` unchanged

### Claude's Discretion
- Exact migration file timestamp and directory name
- Whether `prisma generate` is run as a separate step or chained after migration SQL
- Exact canned response shape for the fake Anthropic client in tests
- Whether the new test file also tests `buildSystemPrompt()` behavior with different tones (out of scope unless trivial)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AICONF-02 | Editor can override AI settings per source (different prompt templates for OTS.at vs individual RSS feeds) | `getResolvedAiConfig(db, sourceId)` already implemented in `ai-config-dal.ts`; this phase wires it into the pipeline by adding `Article.sourceId` FK and passing it through `runStep2Write`. The DAL merge logic (override fields fall through to global on null) is already tested and confirmed working. |

</phase_requirements>

---

## Summary

Phase 8 has two cleanly separable tasks: producing `07-VERIFICATION.md` for Phase 7 and wiring `Article.sourceId` through the ingestion and pipeline path so per-source AI tone/style settings actually affect article generation.

The Phase 7 verification task is purely documentary. The `validation.test.ts` file exists, all 4 describe blocks are implemented, and the Phase 07-02-SUMMARY.md records 183/183 tests green. The executor runs `npx vitest run`, captures the real count, and writes a checklist file with evidence notes and a Known Limitations section. No code changes are required for this task.

The pipeline wiring task has five concrete code changes: (1) Prisma schema addition of `Article.sourceId Int?` with FK and index, (2) hand-crafted migration SQL, (3) `prisma generate`, (4) `ingest.ts` passes `source.id` on `article.create()`, (5) `runStep2Write` gains an optional `sourceId` 5th parameter and calls `getResolvedAiConfig` instead of `getAiConfig`. A new test file exercises the two cases (override present, override absent).

**Primary recommendation:** Execute verification first (no risk), then migration + schema + wiring in dependency order: schema change → migration SQL → prisma generate → ingest.ts → step2-write.ts → pipeline.ts → new test file.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma Client | v6.x (project-installed) | ORM, schema source of truth, FK relation definitions | Already project standard |
| pglite-prisma-adapter | 0.6.1 | Runs Prisma against in-process PostgreSQL WASM in tests | Pinned in STATE.md — v0.7.x conflicts with Prisma v6 |
| vitest | ^2.1.9 | Test runner | Already configured (`vitest.config.ts`) |
| `@anthropic-ai/sdk` | project-installed | Fake client target for `vi.fn()` in override test | Already project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:crypto` | built-in | `randomUUID()` not needed here (no new fixture seeding required) | N/A for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-crafted SQL migration | `prisma migrate dev` | Requires live Postgres; project uses pgLite for tests — hand-crafted SQL is the established pattern |
| `getResolvedAiConfig` | New function | `getResolvedAiConfig` already handles null sourceId → global fallback; no new function needed |

**No new packages need to be installed for this phase.**

---

## Architecture Patterns

### Established Project Structure (relevant files)
```
prisma/
  schema.prisma                       # Add sourceId field + relation to Article and Source
  migrations/
    20260323_phase8_article_source_id/ # New migration directory (timestamp-prefixed)
      migration.sql                    # Hand-crafted ALTER TABLE + FK + INDEX

src/lib/
  ingestion/
    ingest.ts                          # Add sourceId: src.id to article.create()
  ai/
    steps/
      step2-write.ts                   # Add sourceId? param, call getResolvedAiConfig
      step2-write-source-override.test.ts  # New: override vs. global config tests
    pipeline.ts                        # Pass article.sourceId to runStep2Write

.planning/phases/07-extensibility-and-quality-validation/
  07-VERIFICATION.md                   # New: Phase 7 formal verification document
```

### Pattern 1: Nullable FK with onDelete: SetNull (Prisma schema)

**What:** Adding a nullable FK column to an existing table where the referenced row can be deleted without cascading article deletion.

**When to use:** When an FK target (Source) may be removed by an admin but the child rows (Article) should survive with the FK set to NULL rather than being cascade-deleted.

**Prisma schema example (confirmed from existing AiSourceConfig pattern in schema.prisma):**
```prisma
// In Article model — add:
sourceId  Int?
source_fk Source? @relation(fields: [sourceId], references: [id], onDelete: SetNull)
@@index([sourceId])

// In Source model — add reverse relation:
articles  Article[]
```

Note: The existing `source ArticleSource` enum field on Article is named `source`; the new FK relation field name must be different (e.g. `sourceFk` or `sourceRef`). Prisma requires unique field names per model.

### Pattern 2: Hand-Crafted Migration SQL

**What:** Timestamp-prefixed directory under `prisma/migrations/`, a `migration.sql` file with ALTER TABLE and constraint DDL. No `prisma migrate dev` needed.

**When to use:** This is the only migration pattern used in this project (pgLite has no live Postgres server).

**Example based on existing phase5 migration (confirmed from `prisma/migrations/20260322_phase5/migration.sql`):**
```sql
-- Phase 8: Add Article.sourceId FK to Source
ALTER TABLE "Article" ADD COLUMN "sourceId" INTEGER REFERENCES "Source"("id") ON DELETE SET NULL;
CREATE INDEX "Article_sourceId_idx" ON "Article"("sourceId");
```

Directory name example: `20260323_phase8_article_source_id`

### Pattern 3: Optional Parameter Extension with DI overload

**What:** Adding an optional parameter to an existing function while keeping the existing call sites compiling.

**Confirmed from step2-write.ts current signature:**
```typescript
export async function runStep2Write(
  client: Anthropic,
  articleText: string,
  bezirkNames: string[],
  db?: PrismaClient
): Promise<Step2Result>
```

**After adding sourceId (5th optional parameter):**
```typescript
export async function runStep2Write(
  client: Anthropic,
  articleText: string,
  bezirkNames: string[],
  db?: PrismaClient,
  sourceId?: number
): Promise<Step2Result>
```

All existing call sites (`pipeline.ts` line 148, existing `step2-write.test.ts` tests) continue to compile without changes because `sourceId` is optional.

### Pattern 4: getResolvedAiConfig call pattern

**What:** Replace `getAiConfig(db)` + manual ResolvedAiConfig construction with `getResolvedAiConfig(db, sourceId ?? undefined)`.

**Confirmed from `ai-config-dal.ts`:**

```typescript
// Current code in runStep2Write (to be removed):
const aiConfig = await getAiConfig(db)
const resolvedConfig: ResolvedAiConfig = {
  tone: aiConfig.tone,
  articleLength: aiConfig.articleLength,
  styleNotes: aiConfig.styleNotes,
  modelOverride: aiConfig.modelOverride,
}

// Replacement (single call, handles null sourceId → global fallback):
const resolvedConfig = await getResolvedAiConfig(db, sourceId ?? undefined)
```

The `getResolvedAiConfig` signature: `getResolvedAiConfig(dbOrSourceId: PrismaClient | number, sourceId?: number)`. When called with a PrismaClient as first arg and `undefined` as second arg, `sid` is set to `null` and the function skips the `aiSourceConfig.findFirst` call, returning the global config — this is the confirmed null-fallthrough path (verified in `ai-config-dal.ts` lines 131-136).

### Pattern 5: pgLite override test with real DB

**What:** Test that uses a real pgLite DB instance (not mocked Prisma) to exercise the full config resolution path.

**Confirmed pattern from `step2-write.test.ts` and `setup-db.ts`:**
```typescript
import { createTestDb, cleanDb } from '../../../test/setup-db'

describe('runStep2Write() — per-source override', () => {
  let db: PrismaClient

  beforeEach(async () => {
    db = await createTestDb()
    await cleanDb(db)
  })

  it('uses per-source AiSourceConfig override when sourceId is set', async () => {
    // Create minimal Source row
    const src = await db.source.create({
      data: { type: 'RSS', url: 'https://example.com/feed.rss' },
    })
    // Create AiSourceConfig with a distinct model override
    await db.aiSourceConfig.create({
      data: { sourceId: src.id, modelOverride: 'claude-opus-4-5' },
    })
    // Global AiConfig (will be created by getAiConfig find-or-create)
    // Fake Anthropic client
    const mockCreate = vi.fn().mockResolvedValue({ /* canned response */ })
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic

    await runStep2Write(mockClient, 'Text.', [], db, src.id)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-5' })
    )
  })

  it('falls through to global config when sourceId is null/undefined', async () => {
    // similar — assert default model used
  })
})
```

**Critical:** `createTestDb()` applies all migrations via sorted directory scan. The new migration must be added before these tests run. Since `createTestDb()` runs in the test process, and the migration directory is on disk, adding the migration file is sufficient — no test infrastructure change needed.

### Anti-Patterns to Avoid

- **Prisma relation field name collision:** The Article model already has `source ArticleSource` (enum field). The new relation field for `sourceId` FK must use a different name (e.g., `sourceFk`). Prisma does not allow two fields with the same name.
- **Using `getAiConfig` directly in tests:** The override test should use `getResolvedAiConfig` indirectly via `runStep2Write`; testing the DAL in isolation is already covered in existing ai-config-dal tests.
- **Backfilling sourceId:** Explicitly do not backfill existing Article rows — they are already PUBLISHED and the null sourceId correctly falls through to global config at pipeline time.
- **Modifying existing `step2-write.test.ts`:** The existing tests use a mock DB that only provides `aiConfig.findFirst`. Adding `sourceId` as an optional parameter means existing call sites compile unchanged — no edits needed to passing tests.
- **`prisma migrate dev` or live Postgres:** Not available in this project's development/test setup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Merging per-source config onto global defaults | Custom merge function in step2-write.ts | `getResolvedAiConfig(db, sourceId)` in `ai-config-dal.ts` | Already implemented, already tested, handles all null/undefined edge cases |
| FK constraint enforcement | Application-level check before article.create | Prisma schema FK + SQL `REFERENCES ... ON DELETE SET NULL` | Database enforces integrity; application code stays clean |
| Test DB with new schema | Manually patching test DB after `createTestDb()` | Just add the migration SQL file to the correct directory | `createTestDb()` already scans and applies all migrations in sorted order |

---

## Common Pitfalls

### Pitfall 1: Prisma Relation Field Name Conflicts

**What goes wrong:** Adding `source Source? @relation(...)` to Article when `source ArticleSource` already exists — Prisma generator fails with a duplicate field name error.

**Why it happens:** The existing `source` field holds the `ArticleSource` enum value. A new FK relation cannot share the same name.

**How to avoid:** Use a distinct name for the new relation field — e.g., `sourceFk Source? @relation(...)` with `sourceId Int?`. The FK column in the DB is `sourceId`; the Prisma relation accessor is `sourceFk`.

**Warning signs:** `prisma generate` outputs a schema validation error mentioning duplicate field names.

### Pitfall 2: `prisma generate` Must Run After Schema Change

**What goes wrong:** The new `sourceId` field on Article is not available in the TypeScript Prisma client types until `prisma generate` is run after updating `schema.prisma`.

**Why it happens:** Prisma generates TypeScript types from the schema at generate-time, not at runtime.

**How to avoid:** Run `npx prisma generate` after adding the field to `schema.prisma` and before writing any TypeScript that references `article.sourceId`.

**Warning signs:** TypeScript error `Property 'sourceId' does not exist on type 'Article'`.

### Pitfall 3: Migration Applied in Wrong Order

**What goes wrong:** The new migration SQL file has a directory name that sorts after a later migration, causing pgLite to skip it or apply it out of order.

**Why it happens:** `createTestDb()` uses `readdirSync(MIGRATIONS_DIR).sort()` — alphabetical sort. All existing migrations use `YYYYMMDD` prefix.

**How to avoid:** Use a timestamp-prefixed directory name like `20260323_phase8_article_source_id` — this sorts after `20260323_phase6_publicid` (the current last migration), ensuring correct application order.

**Warning signs:** Tests fail with `column "sourceId" does not exist` on Article queries.

### Pitfall 4: `getResolvedAiConfig` Call Signature Mismatch

**What goes wrong:** Calling `getResolvedAiConfig(sourceId ?? undefined)` (one arg) instead of `getResolvedAiConfig(db, sourceId ?? undefined)` (two args with injected client).

**Why it happens:** The overloaded signature allows both `getResolvedAiConfig(db, sourceId)` and `getResolvedAiConfig(sourceId)` — passing the wrong form in a test that injects `db` will use the production singleton instead.

**How to avoid:** In `runStep2Write`, always pass `db` as the first argument: `await getResolvedAiConfig(db, sourceId ?? undefined)`. The existing `getAiConfig(db)` call already follows this pattern — replace it directly.

**Warning signs:** Tests using injected pgLite DB pass but the resolved config comes from the production singleton (likely null → defaults, not the override just written to pgLite).

### Pitfall 5: `07-VERIFICATION.md` Written Before Running Tests

**What goes wrong:** The verification doc includes a stale test count (not from actual execution) or claims "PASS" without running the suite first.

**Why it happens:** Time pressure, or mistakenly treating the 07-02-SUMMARY.md record as the authoritative current count.

**How to avoid:** The plan must explicitly sequence: `npx vitest run` first → capture stdout count → then write `07-VERIFICATION.md` with the real output. The CONTEXT.md decision is explicit: "Phase 8 executor runs tests first."

**Warning signs:** The `07-VERIFICATION.md` test count does not match the actual vitest output at time of execution (new Phase 8 tests will increase the count from 183).

---

## Code Examples

### Migration SQL (hand-crafted, following project pattern)
```sql
-- Phase 8: Add Article.sourceId nullable FK to Source
-- onDelete: SET NULL — articles survive Source deletion, fall through to global AI config
ALTER TABLE "Article" ADD COLUMN "sourceId" INTEGER REFERENCES "Source"("id") ON DELETE SET NULL;
CREATE INDEX "Article_sourceId_idx" ON "Article"("sourceId");
```
Source: Confirmed FK pattern from `prisma/migrations/20260322_phase5/migration.sql` lines 29-30.

### Prisma Schema Change (Article model additions)
```prisma
model Article {
  // ... existing fields unchanged ...
  sourceId  Int?
  sourceFk  Source?   @relation(fields: [sourceId], references: [id], onDelete: SetNull)
  // ... rest of model ...
  @@index([sourceId])
}

model Source {
  // ... existing fields unchanged ...
  articles  Article[]
  // ... rest of model ...
}
```

### ingest.ts article.create() update
```typescript
await db.article.create({
  data: {
    externalId: item.externalId,
    source: src.type,
    sourceId: src.id,        // NEW — wires Article to Source for per-source AI config
    status: 'FETCHED',
    title: item.title,
    content: item.body,
    contentHash,
    rawPayload: item.rawPayload ?? undefined,
    publishedAt: item.publishedAt ?? undefined,
  },
})
```

### runStep2Write signature + body update
```typescript
export async function runStep2Write(
  client: Anthropic,
  articleText: string,
  bezirkNames: string[],
  db?: PrismaClient,
  sourceId?: number        // NEW optional 5th parameter
): Promise<Step2Result> {
  // Replace getAiConfig(db) + manual ResolvedAiConfig construction with:
  const resolvedConfig = await getResolvedAiConfig(db, sourceId ?? undefined)
  // ... rest unchanged ...
}
```

### pipeline.ts call-site update (line 148)
```typescript
// Pass article.sourceId as 5th argument
const step2 = await runStep2Write(
  anthropicClient,
  articleText,
  matchedBezirkNames,
  db,
  article.sourceId ?? undefined   // NEW
)
```

### 07-VERIFICATION.md structure
```markdown
# Phase 7: Extensibility and Quality Validation — Verification

**Verified:** 2026-03-23
**Test suite:** `npx vitest run` — {N}/{N} tests green (vitest, 2026-03-23)

## Success Criteria

- [x] **Criterion 1: Adapter Extensibility (ING-02)**
  describe("Criterion 1: Adapter Extensibility") — 2 tests green
  Evidence: ORF Steiermark ingests via rssAdapter with zero new adapter code.

- [x] **Criterion 2: Cross-Source Deduplication (ING-03)**
  describe("Criterion 2: Cross-Source Deduplication") — 2 tests green
  Evidence: OTS article pre-seeded; RSS ingest of identical content → itemsNew === 0.

- [x] **Criterion 3: Operator Alerts**
  describe("Criterion 3: Operator Alerts") — 6 tests green
  Evidence: DEGRADED, DOWN, circuit-breaker fire/no-fire, dead-man fire/no-fire all verified.

- [x] **Criterion 4: Reader Query Performance**
  describe("Criterion 4: Reader Query Performance") — 2 tests green
  Evidence: All 3 reader queries complete < 500ms against 1000-article pgLite dataset.

## Known Limitations

- OTS prompt wording (system prompt content) not tested against real OTS data — prompt quality
  requires human review with actual OTS press releases.
- Performance validated against pgLite WASM dataset only — production PostgreSQL performance
  may differ (likely faster due to native engine).
- Dead-man threshold behavior verified with synthetic timestamps only, not observed in production.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getAiConfig(db)` in step2-write.ts | `getResolvedAiConfig(db, sourceId)` | Phase 8 (this phase) | Per-source AI config now affects article generation |
| No `Article.sourceId` FK | `Article.sourceId Int?` FK to Source | Phase 8 (this phase) | Articles are now traceable to their source for config resolution |
| `runStep2Write` uses global config only | `runStep2Write` resolves per-source config | Phase 8 (this phase) | Closes AICONF-02 |

**Deprecated/outdated:**
- The TODO comment `// TODO(Phase 7): pass sourceId to getResolvedAiConfig for per-source prompt overrides` in `step2-write.ts` line 111 — this is explicitly removed in Phase 8.

---

## Open Questions

1. **Prisma relation field name for the new Article→Source FK**
   - What we know: `Article.source` is already taken by the `ArticleSource` enum field
   - What's unclear: The CONTEXT.md says "Add `Article.sourceId Int?`" and "Add reverse relation `Source.articles Article[]`" but doesn't name the relation accessor field on Article explicitly
   - Recommendation: Use `sourceFk` as the Prisma relation field name on Article (keeps FK column as `sourceId` in DB). The planner should make this choice explicit in the plan.

2. **Whether `prisma generate` output is committed**
   - What we know: `commit_docs: true` in config.json; the generated client files are under `node_modules` (not committed)
   - What's unclear: Only the `schema.prisma` change and migration SQL need to be committed; `prisma generate` is run as a build step
   - Recommendation: Run `npx prisma generate` as part of the implementation task, commit only `schema.prisma` and the migration SQL.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.1.9 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AICONF-02 | sourceId with AiSourceConfig override → override config used in messages.create | integration (real pgLite + vi.fn client) | `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts` | Wave 0 |
| AICONF-02 | sourceId = null → global config used (no override) | integration (real pgLite + vi.fn client) | `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts` | Wave 0 |
| Phase 7 verification (non-req) | All 4 Phase 7 criteria documented as PASS with evidence | manual verification doc | `npx vitest run` (count captured before writing doc) | N/A — doc output |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ai/steps/step2-write-source-override.test.ts` — covers AICONF-02 (two test cases)

*(All other test infrastructure exists: vitest, createTestDb, cleanDb, vi.fn client pattern)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/ai/steps/step2-write.ts` — current function signature, TODO comment location, getAiConfig call
- Direct code inspection: `src/lib/admin/ai-config-dal.ts` — `getResolvedAiConfig` signature and null-fallthrough logic (lines 131-136)
- Direct code inspection: `src/lib/ai/pipeline.ts` — current `runStep2Write` call site (line 148), Article fields available
- Direct code inspection: `src/lib/ingestion/ingest.ts` — `article.create()` call (lines 115-128), `src.id` available
- Direct code inspection: `prisma/schema.prisma` — Article model, Source model, existing FK patterns
- Direct code inspection: `prisma/migrations/20260322_phase5/migration.sql` — FK DDL pattern (`REFERENCES "Source"("id") ON DELETE CASCADE`)
- Direct code inspection: `prisma/migrations/20260323_phase6_publicid/migration.sql` — `ALTER TABLE "Article"` pattern
- Direct code inspection: `src/test/setup-db.ts` — `createTestDb()` sorted migration scan, `cleanDb()` deletion order
- Direct code inspection: `src/lib/ai/steps/step2-write.test.ts` — existing test structure (mock client + mock DB pattern)
- Direct code inspection: `.planning/phases/07-extensibility-and-quality-validation/07-02-SUMMARY.md` — 183/183 tests, 12/12 validation tests, exact describe block names
- Direct code inspection: `.planning/phases/08-per-source-ai-config-wiring/08-CONTEXT.md` — all implementation decisions

### Secondary (MEDIUM confidence)
- STATE.md accumulated decisions — confirm pglite-prisma-adapter@0.6.1 pinned, migration SQL hand-crafted pattern, DI duck-typing pattern

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing project libraries, no new dependencies
- Architecture: HIGH — all patterns confirmed by direct code inspection of existing implementations
- Pitfalls: HIGH — derived from direct inspection of code that would fail if pitfalls are triggered
- Migration SQL: HIGH — exact pattern confirmed from two existing migrations

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable — no fast-moving ecosystem dependencies)
