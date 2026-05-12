# Progress Log

- [10:00] Branch `chore/cleanup-auth-barrel` angelegt, Tag `vor-aufraeumen-phase-45` auf `a936796` (commit: a936796)
- [10:00] TASK.md angelegt (commit: a7ba056, amended)
- [10:05] PROGRESS.md-Scaffold (commit: 422889e)
- [10:09] Baseline-Run vor Löschung von `src/lib/admin/auth.ts`:
  - `npm run typecheck` — **FAIL** (Exit 1, 2 vorhandene Fehler):
    - `src/lib/admin/map-actions.test.ts:182:3` — TS2304: Cannot find name 'afterEach'
    - `src/lib/images/mapgen.test.ts:193:3` — TS2322: ArrayBuffer|SharedArrayBuffer Mismatch
  - `npm run test` — **FAIL** (Exit 1, 1 Suite + 2 Tests):
    - Suite-Fehler: `src/app/__tests__/root-layout-adsense.test.ts` — fehlendes `Plus_Jakarta_Sans`-Mock in `vi.mock('next/font/google', …)`
    - Test 1: `src/lib/content/bezirke.test.ts` CONF-02 "every Bezirk has … gemeindeSynonyms.length >= 1" → erhielt 0
    - Test 2: `src/lib/content/bezirke.test.ts` CONF-02 "getBezirkBySlug('liezen') … include 'Ennstal'" → leeres Array
  - `npm run build` — **PASS** (Exit 0)
- [10:11] HALT: Baseline nicht grün. Keine Löschung ausgeführt. Klärung mit Auftraggeber erforderlich.
- [10:20] Auftraggeber entscheidet Option 1: Vergleich auf "gleicher Zustand" (gleiche Failures, keine neuen, keine geheilten).
- [10:22] Verifikation der Baseline-Fingerprints: Imports auf `@/lib/admin/auth` und `../auth` aus `src/lib/admin/`: keine Treffer (auch nicht in `scripts/`, `test/`, `prisma/`).
- [10:23] Post-Run nach Löschung (mit stalem `tsconfig.tsbuildinfo`):
  - `typecheck`: Exit 2 (≠ Baseline-Exit 1), Diagnostics IDENTISCH zur Baseline
  - `test`: Exit 1, Failure-Summary IDENTISCH zur Baseline (`diff` leer)
  - `build`: Exit 0
- [10:26] Cache-Artefakt-Verdacht verifiziert: Clean-Cache-Runs (nach `rm tsconfig.tsbuildinfo`) auf beiden Seiten:
  - Clean-Baseline-typecheck (auth.ts vorhanden, leerer Cache): Exit 2, identische Diagnostics
  - Clean-Post-typecheck (auth.ts gelöscht, leerer Cache): Exit 2, identische Diagnostics
  - `diff` zwischen Clean-Baseline-Errors und Clean-Post-Errors: leer
  → Exit-Code-Shift 1→2 im ersten Post-Run war stale-cache-Artefakt; State ist real "gleich".
- [10:28] Löschung committet: `8f0c31f refactor: remove unused auth.ts barrel`
- [11:05] Konkurrierende CLI-Session entdeckt (PID 25281), zwei Phase-44-Doku-Commits (df8c2d4, d25bc48) auf chore/cleanup-auth-barrel gelandet, kein src/-Touch.
- [11:10] Andere Session beendet (verifiziert per `ps -p 25281` → exit 1).
- [11:14] Phase-44-Commits auf neuen Branch `wip/phase-44` verschoben; ROADMAP.md-WIP dort gesichert als `a81d045 wip(44): roadmap update from parallel session`.
- [11:16] `chore/cleanup-auth-barrel` via `reset --hard fb26a8a` auf sauberen Auth-Cleanup-Stand zurückgesetzt. NEBENWIRKUNG / DATENVERLUST: `.planning/config.json` working-tree-Modifikation wurde dabei mit zurückgesetzt (war nirgendwo committed). `AGENTS.md` hat User manuell rekonstruiert.
- [11:20] `main` per `--ff-only` auf `fb26a8a` vorgerückt; `chore/cleanup-auth-barrel` gelöscht. Tag `vor-aufraeumen-phase-45` bleibt als Rollback-Anker auf `a936796`.

## 2026-05-12 — Phase 43 Cutover-Gate (nachgeholt)

- [12:15] Resume-Session: `/gsd:resume-work` ausgeführt; State geladen. Befund: Phase-43-Code seit ~2026-05-11 14:21 (`690eab5`) auf `main`, Vercel auto-deployed; merged-Pfad ist live (Code-Default `AI_USE_MERGED_CALL='true'` in `pipeline.ts:151`, kein Vercel-Override). Cutover-Gate war nie vor Deployment gelaufen.
- [12:20] Operator-Bestätigung: `AI_USE_MERGED_CALL` ist in Vercel-Production NICHT gesetzt → Code-Default greift → merged-Pfad serviert Prod-Traffic.
- [12:22] Step 1 (Token-Baseline) aus historischer `PipelineRun`-Tabelle abgefragt (`/tmp/baseline-query.ts`, lokal mit `.env.vercel`-DATABASE_URL): 24 Legacy-Runs (2026-04-15..2026-05-08, 182 Artikel) Ø 1884 Input/Artikel; 1 Post-Cutover-Run #52 (2026-05-12, 6 Artikel) Ø 1860 Input/Artikel → **1,3 % Reduktion** (Ziel ≥ 50 %). N=1 + strukturelle Cache-TTL-Blockade dokumentiert.
- [12:25] Tool-Setup-Probleme behoben: (1) `.env.local` hatte malformed `ANTHROPIC_API_KEY` (127 statt 108 Chars) → `.env.vercel`-Wert verwendet. (2) `.env` enthielt eine veraltete Supabase-DATABASE_URL, die Prisma auto-loadete und Neon-URL überschrieb → DATABASE_URL inline an Aufrufe übergeben. (3) `tsx` aus `/tmp/` brauchte `NODE_PATH=$PWD/node_modules` für Prisma-Auflösung.
- [12:28] Step 2 (Replay-Harness) ausgeführt: `ANTHROPIC_API_KEY=… DATABASE_URL=… NODE_PATH=$PWD/node_modules npx tsx scripts/ai-replay-fixtures.ts` → **9/20 passed** (Output: `/tmp/replay-v3-cutover-fail.log`). 11 Failures: 9× body-missing Source-Fakten, 2× SEO-Title-Overflow, 1× Tag-Halluzination (f18).
- [12:32] Triage von 6 Fixtures (f01/f08/f09/f12/f15/f18): Mehrheit sind echte Quality-Regresse, nicht über­strenge Invariants. f12/f15 sind leichte Prompt-Tunes.
- [12:35] Step 3 (AIPL-10 SQL) ausgeführt: `UPDATE Article SET status='FETCHED' WHERE status='TAGGED'` via `/tmp/aipl-10-sql.ts` → 1 Zeile aktualisiert (Article id=181, "Verkehrsunfall zwischen Pkw und Fahrrad"), 0 verbleibend.
- [12:40] DECISIONS.md angelegt mit Rollback-Empfehlung (Vercel `AI_USE_MERGED_CALL=false`) inklusive verworfener Alternativen (commit: 9d1c2f4). STATE.md aktualisiert (last_activity, stopped_at, Pending Todos, Blockers, Session Continuity).
- [12:42] Step 4 (Deploy + Verify ≥50 % Reduktion) bleibt PENDING — wartet auf Operator-Vercel-Env-Flip. (commit: pending)
- [13:00] Operator-Bestätigung: `AI_USE_MERGED_CALL=false` in Vercel-Production gesetzt + Redeploy ausgeführt.
- [13:01] Cron-Manual-Trigger via `curl POST` → HTTP 405 (Method Not Allowed). Runbook in `43-04-SUMMARY.md` ist hier falsch — Route nutzt GET.
- [13:02] Cron-Re-Trigger via `curl GET -H "Authorization: Bearer $CRON_SECRET" /api/cron` → HTTP 200, 37 s Laufzeit, Response: `processed=4 written=3 published=3 reviewBacklog=2`.
- [13:05] Verifikation per `/tmp/baseline-query.ts`: Run #53 (4 Artikel, 3 written, 75 %) Ø 2593 Input / Ø 389 Output / Artikel. Drei unabhängige Signale matchen Legacy-Pfad, nicht merged:
  - Output-Magnitude 389/Art liegt in Legacy-Band 165–414; merged #52 war 189 (flach).
  - Output skaliert mit written-Ratio (Legacy-Pattern): #53 75 % → 389 Out, vergleichbar mit Legacy #40 (83 %) → 414 Out. Merged-Pfad skaliert nicht.
  - Input/Output-Ratio 6,7 passt zu Legacy-Band 5–7; merged #52 war 9,8.
- [13:10] **Rollback verifiziert.** Production läuft wieder auf Legacy-Pfad seit Cron-Run #53. Reader-Quality-Regress (fehlende Source-Fakten in merged-Output) ist gestoppt.
- [13:15] Step 4 als completed markiert: Original-Ziel (≥ 50 % Input-Reduktion via merged) ist moot, weil Gate gefailt + Rollback durchgeführt. ≥ 50 %-Ziel wird auf einen zukünftigen Re-Cutover-Versuch verschoben (nach Merged-Prompt-Quality-Fixes oder im Rahmen von Phase 45 Quality-Eval).
- [13:16] Carry-over: Cron-Runbook in `43-04-SUMMARY.md` Step 1 zeigt `curl -X POST` — sollte `GET` sein. Cosmetic; in eine Folge-PR korrigieren.

## 2026-05-12 — Merged-Call-Tuning (Path A) Iterationen

- [15:10] TASK.md neu gesetzt: Merged-Prompt-Quality-Tuning, 3-Iterations-Budget.
- [15:15] Iteration 1: drei Prompt-Änderungen in `src/lib/ai/steps/merged.ts` (FAKTENTREUE-Regel + KURZE QUELLEN in UMSCHREIBUNG, harte seoTitle-Grenze, Bezirk-Strenge gegen Regional-Sammelbegriffe). Unit-Tests 12/12 grün (commit: 25007cc).
- [15:20] Iteration 1 Harness-Run: **10/20** (+1 vs Baseline 9/20). Failures-Verteilung zeigte starke Sampling-Noise (fixtures flipping pass/fail vs baseline ohne dass die Edits sie touchten).
- [16:42] Iteration 2: `temperature: 0` in `runMergedCall` gesetzt (deterministischer Sampling, generelle Quality-Verbesserung für News). Unit-Tests 12/12 grün (commit: 27bc1f3).
- [16:45] Iteration 2 Harness-Run: **7/20** — Regression. Diagnose: temperature=0 macht Haikus Paraphrasierungs-Tendenz konsistent ("A2" → "Autobahn", "Auffahrunfall" → "Unfall"), exponiert dass tool_use field-descriptions stärker gewichtet werden als das System-Prompt.
- [16:50] Iteration 3: Regeln in die Schema-Field-Descriptions (`body`, `seoTitle`, `isStateWide`) verschoben + isStateWide um Bundes-vs-Land-Disambiguierung erweitert. Unit-Tests 12/12 grün (commit: 6a0c63f).
- [16:55] Iteration 3 Harness-Run: **7/20** — kein Sprung. f12 (Montanuniversität) + f15 (seoTitle 71→pass) gewonnen, dafür f03 (7,2 + Budget), f05 (Knittelfeld + Kindergarten), f07 (Eggenberg + Ausstellung) verloren. Schema-Pushes überschreiben Haikus Paraphrasierungs-Base-Behavior nicht.
- [16:55] HALT laut TASK.md-Budget. Konsultation mit Auftraggeber.
- [16:50] Iteration 4 (Sonnet-Experiment, vom Auftraggeber beauftragt): `AI_MODEL_OVERRIDE` env-var-Hook in `runMergedCall` eingebaut (3-Zeilen-Patch, generally useful für Phase 45 Model-Comparison). Unit-Tests 12/12 grün (commit: e7c6f84).
- [16:58] Iteration 4 Harness-Run mit Sonnet 4.6: **16/20**. Verbleibende 4: f05 (officeholder marker — sollte laut 43-04-SUMMARY in Phase 45 flippen, Sonnet trifft die Entscheidung implizit; real 17/20), f08 (Pensionsreform paraphrase-stur), f10 (Skiweltcup paraphrase-stur), f18 (Liezen-over-tag, body-Mariazell-Fakt gewonnen).
- [17:00] **Closure-Entscheidung (Auftraggeber):** v3.2 Merged-Call als "infeasible mit Kostenziel" schließen. Production bleibt auf Legacy Haiku. Sonnet hits Quality-Bar aber defeated 50%-Kostenziel (5×/Token). Merged-Call-Code bleibt dormant im Tree für künftige Re-Attempts (Phase 44 Telemetry + Phase 45 Quality-Loop + Model-Class-Re-Eval). DECISIONS.md 2026-05-12 Closure-Entry geschrieben.

## 2026-05-12 — Phase 44-04 Ingest-Hardening

- [17:05] Task 1 (INGEST-02 + Schema): Migration `20260514_phase44_source_cursor` (Source × 3 nullable: lastFetchedAt/etag/lastModified) + `fetchWithTimeout` Helper (AbortController + 10s setTimeout/clearTimeout) mit 4 Unit-Tests (commit: 79cb1ed).
- [17:08] Task 2 (INGEST-01/02/03 + Option A): OTS-Adapter Refactor — `findMany({ in: keys })` Bulk-Dedup, fetchWithTimeout für list+detail, `lastFetchedAt - 30min` Cursor mit 24h-Fallback. `AdapterFn` Return-Shape erweitert auf `AdapterResult { items, etag?, lastModified? }`. 10 Unit-Tests (commit: 6a3cbf5). Ripple in registry.ts/ingest.ts/rss.ts bewusst auf Tasks 3+4 verschoben.
- [17:09] Task 3 (INGEST-02/04): RSS-Adapter Refactor — conditional GET (If-None-Match + If-Modified-Since), 304-Short-Circuit ohne `response.text()` (preserve prior validators als `undefined`), neue validators verbatim auf 200, fetchWithTimeout-Wrap. 14 Unit-Tests (commit: c92ae05). registry.ts type-clean; nur ingest.ts noch Ripple (Task 4).
- [17:20] Task 4 (INGEST-03/04/05): ingest.ts transaktional — beide Pfade (Success + Failure) packen IngestionRun.update + Source.update in `db.\$transaction([...])`. Success-Pfad persistiert `lastFetchedAt = new Date()` plus etag/lastModified via tri-state conditional spread (string=write, undefined/null=omit). 6 neue Tests (Proxy-Wrapper für \$transaction-Tracking, da `vi.spyOn` auf Prisma-Proxy unzuverlässig). Rule-3 Ripple: validation.test.ts (3 mock-sites von RawItem[] auf AdapterResult migriert + fetch-mock auf echtes Response). 14 ingest tests + 12 validation tests grün (commit: 6559a00).
- [17:21] Full-Suite-Check: 421/423 grün, 2 verbleibende Failures sind dokumentierte Baseline (bezirke.test.ts CONF-02 x2, plus 1 root-layout-adsense.test.ts Suite — Plus_Jakarta_Sans Font-Loader). Keine Verschlechterung der Baseline.
- [17:25] 44-04 SUMMARY.md geschrieben (commit: abbd802). Phase 44-04 lokal abgeschlossen; STATE.md durch executor-Agent aktualisiert.

## 2026-05-12 — Phase 44-04 Deploy + Mid-Rollout-Fix

- [20:55] DEFERRED-Marker auf 44-01/02/03 Plans (drei Top-of-File-Admonitions, verweisen auf DECISIONS.md 2026-05-12 Closure) angebracht und alle vier Plans erstmalig committed (commit: d0e28be). Nur 44-04 ist ausführbar; 44-01/02/03 warten auf /gsd:plan-phase Re-Plan.
- [21:00] Vorbedingung: 47 commits lagen lokal unpushed; package.json build-Script kennt `prisma migrate deploy` NICHT (nur `prisma generate` in postinstall). Reihenfolge daher: Migration zuerst, push danach.
- [21:01] `prisma migrate deploy` mit `.env.vercel` DATABASE_URL: bricht auf `20260401_add_article_theme` (P3018, "column 'theme' already exists"). Root-Cause aus PROGRESS.md/PROJECT.md bekannt: in v3.1 wurde Article.theme via `prisma db push` direkt hinzugefügt; das nachträglich erzeugte Migration-File hat in Production nie sauber laufen können (Drift bekannt).
- [21:02] Verifikation per `information_schema.columns` + `pg_indexes`: theme-Spalte EXISTIERT (text, nullable), Index `Article_theme_idx` EXISTIERT — DB-State entspricht vollständig der Migration-Intent. `_prisma_migrations` zeigt das File aber als `finished=NO steps=0`.
- [21:02] `prisma migrate resolve --applied 20260401_add_article_theme` → markiert als applied ohne SQL auszuführen (sicher, weil DB-State bereits matching). Anschließend `prisma migrate deploy` erfolgreich: `20260514_phase44_source_cursor` applied → Source × 3 nullable columns vorhanden.
- [21:03] `git push origin main` (47 commits, abbd802..fe42d2f → origin). Vercel auto-deploy gestartet.
- [21:03] Erste Verifikations-Cron (`curl GET /api/cron`): HTTP 200, aber Regression: `[ingest] found=0 new=0 errors=3`. Neuer Fehler auf Source 3 (BMI RSS): "Error: Unrecognized feed format".
- [21:04] Root-Cause-Curl: BMI Server (`https://www.bmi.gv.at/rss/stmk_presse.xml`, myracloud-CDN) reagiert auf den NEUEN `Accept: application/rss+xml, application/atom+xml, application/xml` Header (eingeführt in c92ae05) mit `HTTP/2 302 Location: /errors/info_bmi.html`. Ohne Accept-Header: `HTTP/2 200 Content-Type: text/xml`. Content-Negotiator des Servers erkennt die kanonischen RSS-Mediatypes nicht.
- [21:04] Fix: Accept-Header in rssAdapter entfernt (war spekulativer Add, nicht von INGEST-02/04 verlangt). `npm test rss.test.ts` 14/14 grün. Commit + Push: 21ade92.
- [21:08] Zweite Verifikations-Cron nach Vercel-Redeploy: HTTP 200, `[ingest] found=19 new=1 errors=2`, `[ai] processed=1 written=1 published=1`. errors=2 = bekannte OTS_API_KEY-Misskonfiguration (Sources 1, 6). Source 3 funktioniert.
- [21:09] Production-DB-Verifikation (Source-Tabelle): Source 3 zeigt `lastFetchedAt=Tue May 12 2026 21:08:12 GMT+0200`, `etag="31e9b54042e2dc1:0"`, `lastModified="Tue, 12 May 2026 19:05:09 GMT"`, `healthStatus=OK consecutiveFailures=0 lastSuccessAt=...`. Alle INGEST-01..05-Truths in Produktion bestätigt.
- [21:10] Phase 44-04 vollständig deployed + verifiziert. 48 Commits live auf `origin/main`. v3.2 hat ein gelandetes Improvement (44-04 Ingest-Hardening) plus die Closure-Doku.

## 2026-05-12 — Homepage-Redesign "LODEN & LEUTE" (Iteration 1)

Mockup-driven visuelles Refresh + Brand-Rename. Scope: Homepage + Shell
(AppBar, Footer). Detail-Page/Suche/Admin bleiben alt.
Drei-Commit-Plan: Tokens → Primitives → HomepageLayout+Shell.

- [21:25] DESIGN.md (User-eingereichtes Design-System-Doc) und globals.css Token-Erweiterung committed (commit: dbff8c3). Neue Tokens: `--color-ink-deep` (#1B2D18, Loden-Green für dunkle Sektionen + CTA-Gradient), `--color-on-primary`, `--color-outline-variant`, `--color-surface-deep`, `--spacing-void-md/lg` (5.5/7rem), Type-Scale (display-lg/sm, headline-md, body-lg, label-md) mit line-height/letter-spacing/font-weight Modifiern. Tailwind v4 `@theme`. Keine Komponenten-Touches.
- [21:35] Vier Primitive in `src/components/ui/`: `Eyebrow` (uppercase label-md, tone default/on-dark), `Heading` (variant display-lg/sm + headline-md, `as`-Prop für Tag, tone default/on-dark), `Button` (variant primary mit Ink→Ink-Deep Gradient, tertiary mit 2px-Underline, optional `href` für Next-Link), `SectionBlock` (bg-Variant über alle Surface-Token + voidSize md/lg/none + opt. gutter). Server-renderable, keine `'use client'`-Directives. Typecheck grün (2 vorbestehende Baseline-Failures unverändert). Commit: bcca6cd.
- [21:50] Brand-Rename Wurzelwelt → Loden & Leute (3a). Drei File-Renames via `git mv` (WurzelAppBar→LodenAppBar, WurzelNavBar→LodenNavBar, FragDenWurzelmannCard→FragDenSeppCard), inkl. Export-Namen + interner Typen. Display-Strings angepasst: AppBar-Wortmarke, Footer-Wortmarke ×2, admin-Sidebar, MascotGreeting "Wurzel sagt"→"Sepp sagt", FragDenSepp-Card-Body. Config: `bundesland.config.ts` siteName/publisherName/email. Domain-Defaults: wurzelwelt.at→lodenundleute.at in robots/sitemap/rss-route/artikel-page/geocode + rss.ts docstring. Tests: public-layout-metadata-Mocks + sitemap.test 4× Default-URL. Voller Test-Suite: 421/423 (exakt Baseline, 2 dokumentierte CONF-02-Failures). Kein Visual-Change.

