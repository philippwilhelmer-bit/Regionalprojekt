# AI Merged-Call Fixtures (`src/test/fixtures/ai-merged/`)

20 captured-payload fixtures (`f01..f20.json`) used by:

1. **Phase 43 cutover gate** — `scripts/ai-replay-fixtures.ts` runs every fixture
   against the real Anthropic API via `runMergedCall` and asserts each
   fixture's invariants. All 20 must pass before the merged-call cutover PR
   merges (locked decision in `.planning/phases/43-ai-pipeline-quick-wins/43-CONTEXT.md`).
2. **CI smoke test** — `scripts/ai-replay-fixtures.test.ts` validates every
   fixture against the `Fixture` schema without hitting the API.
3. **Phase 45 eval-harness seed corpus** — these 20 fixtures are the basis for
   the formal eval harness (REQ `QUAL-09`). Phase 45 grows the corpus to 50 and
   adds quality-rubric scoring.

## Invocation

```bash
# Manual cutover gate (real Anthropic API, ~20 calls per run):
ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/ai-replay-fixtures.ts

# CI-safe schema + harness-logic smoke test:
npx vitest run scripts/ai-replay-fixtures.test.ts
```

Expected output of the replay harness final line: `20/20 passed`.
Exit code is `0` iff every fixture passes its invariants.

## Schema

Every fixture matches this shape (declared verbatim in `scripts/ai-replay-fixtures.ts`):

```typescript
interface Fixture {
  id: string                       // matches filename without `.json`
  description: string              // what this fixture covers
  sourceType: 'OTS_AT' | 'RSS'
  rawArticleText: string           // post-extraction input to merged call
  expectedOutput: {
    bezirkSlugs: string[]          // sorted before comparison
    isStateWide: boolean
    mentionsPrivateIndividual: boolean
  }
  contentInvariants: {
    headlineMaxChars?: number
    leadMaxSentences?: number
    bodyMustContain?: string[]     // case-insensitive includes
    bodyMustNotContain?: string[]  // case-insensitive excludes
    seoTitleMaxChars: 60           // fixed
    metaDescriptionMaxChars: 160   // fixed
  }
  expectedFinalStatus: 'WRITTEN' | 'REVIEW'
  notes?: string
}
```

`expectedFinalStatus` is the derived pipeline status. The harness recomputes it
as `REVIEW` when `mentionsPrivateIndividual || (bezirkSlugs.length === 0 && !isStateWide)`,
else `WRITTEN`, and asserts the derivation matches.

### Why invariants (not full-text match)?

LLM output text is non-deterministic. Asserting `bodyMustContain: ['A2']` and
`bodyMustNotContain: ['Tel:']` is robust to minor phrasing changes while
catching real regressions (missing facts, metadata bleed). Headline/lead/body
text itself is NEVER asserted exactly.

## Fixture catalogue

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

- **f05-officeholder-eroeffnung** — flips when Phase 45's officeholder
  exclusion lands: `mentionsPrivateIndividual` flips `true → false`,
  `expectedFinalStatus` flips `REVIEW → WRITTEN`. Update this fixture's
  `expectedOutput` and `expectedFinalStatus` (and `notes`) in Phase 45. The
  drift IS the regression signal.
- **f08-bundes-pensionsreform-no-relevance** — encodes the Phase 43 decision
  that `bezirkSlugs=[] && isStateWide=false` routes to `REVIEW`. Reuses the
  existing REVIEW path (no `reviewReason` column added — schema-free phase).
- **f09 / f16** — two layers of OTS-metadata-bleed regression. f09's
  `rawArticleText` is POST-extractor; f16 simulates the worst case where the
  extractor leaks the contact block and the merged prompt is the last
  defence. Both fixtures' `bodyMustNotContain` invariants must hold.
- **f03 / f17** — two state-wide fixtures cover structured `isStateWide=true`
  replacing the legacy `'steiermark-weit'` magic slug.

## Constraints

- `bezirkSlugs` only uses the 13 canonical slugs from
  `prisma/seed-data/bezirke.ts`. `'steiermark-weit'` is NOT a slug.
- When `isStateWide: true` is set, `bezirkSlugs` MUST be `[]`. The harness
  asserts this consistency on every fixture (smoke test).
- `seoTitleMaxChars: 60` and `metaDescriptionMaxChars: 160` are fixed per the
  schema. Every fixture has these literal values.
- `rawArticleText` is hand-written synthetic German news copy (200–500 chars
  for most; ~1200 chars for the long-form fixture f12). Synthetic but
  realistic — never lifted from real production articles (privacy + freshness).
