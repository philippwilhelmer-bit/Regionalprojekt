# Phase 7: Extensibility and Quality Validation — Verification

**Verified:** 2026-03-23
**Test suite:** `npx vitest run` — 183/183 tests green (vitest, 2026-03-23)
**Validation tests:** 12 tests across 4 describe blocks in `src/test/validation.test.ts`

## Success Criteria

- [x] **Criterion 1: Adapter Extensibility (ING-02)**
  `describe("Criterion 1: Adapter Extensibility")` — 1 test green
  Evidence: ORF Steiermark RSS feed ingested via the generic `rssAdapter` with no new adapter code — `Source.type='RSS'` resolved through `adapterRegistry` unchanged.

- [x] **Criterion 2: Cross-Source Deduplication (ING-03)**
  `describe("Criterion 2: Cross-Source Deduplication")` — 2 tests green
  Evidence: Article with identical `contentHash` arriving first via OTS_AT then via RSS was blocked (`itemsNew=0`, `allArticles.length=1`); article with distinct content was admitted normally.

- [x] **Criterion 3: Operator Alerts**
  `describe("Criterion 3: Operator Alerts")` — 6 tests green
  Evidence: DEGRADED/DOWN `console.warn` fires at correct `consecutiveFailures` thresholds; circuit-breaker halts and warns when `totalInputTokens + totalOutputTokens >= AI_DAILY_TOKEN_THRESHOLD`; dead-man fires when `lastPublishedAt` silence exceeds `PipelineConfig.deadManThresholdHours`, does not fire when within threshold.

- [x] **Criterion 4: Reader Query Performance**
  `describe("Criterion 4: Reader Query Performance")` — 3 tests green
  Evidence: `listArticlesReader`, `getArticleByPublicId`, and `getArticlesByBezirk` each completed in under 500 ms against a pgLite database pre-seeded with 1000 articles.

## Known Limitations

- OTS prompt wording (`SYSTEM_PROMPT_TEMPLATE` in `step1-tag.ts`) has not been validated against real OTS.at press releases — confidence LOW (noted in Phase 3 decisions; deferred to post-launch iteration).
- Performance criterion (Criterion 4) was validated against pgLite WASM running in-process, not production PostgreSQL. Actual query latency under production load will differ.
- Dead-man threshold (Criterion 3) was tested with synthetic timestamps only (`Date.now() - N * 60 * 60 * 1000`) — no real elapsed-time observation.
- Cross-source deduplication (Criterion 2) relies on `contentHash` equality. Minor wording differences between OTS.at and RSS reprints of the same story will not be caught.
- Source health alert tests (Criterion 3 DEGRADED/DOWN) use `console.warn` interception — no integration with a real alerting channel (PagerDuty, email, etc.) is present.
