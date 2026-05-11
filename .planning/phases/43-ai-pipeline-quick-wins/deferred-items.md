# Deferred Items — Phase 43

Pre-existing issues observed during plan execution but out of scope for the
current task (per the executor's SCOPE BOUNDARY rule).

## Discovered during 43-02 execution (2026-05-11)

### TSC errors in unrelated files

These are pre-existing TypeScript errors in files NOT touched by 43-02. They
must be fixed by their owning plans or a dedicated cleanup task.

- `src/lib/admin/map-actions.test.ts:174` — `afterEach` not imported from vitest
- `src/lib/ai/steps/merged.test.ts:5,167` — Owned by Plan 43-01 (in-flight RED phase); GREEN of 43-01 will resolve
- `src/lib/images/mapgen.test.ts:193` — `ArrayBuffer | SharedArrayBuffer` mismatch (post Node 24 upgrade?)

### Vitest failures in unrelated files

- `src/app/__tests__/root-layout-adsense.test.ts` — Plus_Jakarta_Sans import failure (CSS/font loader in test env)
- `src/lib/content/bezirke.test.ts` (CONF-02) — `gemeindeSynonyms` empty for all Bezirke; Liezen missing 'Ennstal' synonym (data drift)
- `src/lib/content/articles.test.ts` — Article DAL (intermittent test DB state?)
- `src/lib/admin/articles-actions.test.ts > createManualArticle` — manual-article creation
- `src/lib/ai/pipeline.test.ts > processArticles() > advances a FETCHED article to TAGGED after Step 1` — pipeline integration

None of these touch `src/lib/ai/extractors/` and none regressed because of 43-02.
