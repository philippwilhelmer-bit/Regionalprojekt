# Task: Merged-Prompt Quality-Tuning (Phase 43 Re-Cutover Preparation) — CLOSED 2026-05-12

**Status:** Closed without convergence. Three Haiku 4.5 iterations did not
reach 20/20; Sonnet 4.6 experiment hit 16/20 but defeats v3.2 cost target.
v3.2 merged-call work is shelved pending Phase 44 telemetry + Phase 45
quality-loop + a model-class re-evaluation. Production stays on legacy
Haiku via `AI_USE_MERGED_CALL=false` on Vercel. See DECISIONS.md
2026-05-12 closure entry for full rationale.

---


## Hintergrund

Phase 43 Cutover-Gate (2026-05-12) hat 9/20 Fixtures bestanden. 11 Failures
verteilen sich auf drei Kategorien (siehe DECISIONS.md 2026-05-12 +
PROGRESS.md ab 12:28):
- Faktentreue (9): body fehlt zentrale Source-Fakten
- seoTitle-Overflow (2): f12 (+1 Zeichen), f15 (+11 Zeichen)
- Bezirk-Über-Tagging (1): f18 → ["bruck-muerzzuschlag","liezen"] statt
  ["bruck-muerzzuschlag"]

Production läuft aktuell auf Legacy (Vercel `AI_USE_MERGED_CALL=false`).
Re-Cutover erst nach 20/20 Harness-Pass.

## Ziel

`src/lib/ai/steps/merged.ts` so anpassen, dass `scripts/ai-replay-fixtures.ts`
gegen die echte Anthropic-API 20/20 Fixtures besteht. Drei gezielte
Prompt/Schema-Änderungen entsprechend den Failure-Kategorien.

## Akzeptanzkriterien

- `npx tsx scripts/ai-replay-fixtures.ts` → `20/20 passed`, Exit-Code 0
- `npm test -- src/lib/ai/steps/merged.test.ts` läuft fehlerfrei (Unit-Test
  prüft Struktur des Calls, nicht Prompt-Inhalt — sollte überleben)
- `npm run typecheck` läuft fehlerfrei für `src/lib/ai/steps/merged.ts`
- Conventional Commit pro Iteration
- PROGRESS.md aktualisiert mit Iteration + Commit-SHA + Harness-Resultat
- DECISIONS.md erweitert mit "Konvergierter Merged-Prompt" Entry sobald 20/20
- Nicht-Ziel-Resultat: wenn nach drei Iterationen <20/20, anhalten und
  Entscheidung mit Auftraggeber suchen

## Drei geplante Änderungen (Iteration 1)

1. **Faktentreue:** UMSCHREIBUNG-Sektion erweitern um zwei Regeln —
   namentliche Erhaltung von Orten/Bezirken/Organisationen/Ereignis-
   bezeichnungen/Zahlen + "kurze Quelltexte nicht padden".
2. **seoTitle ≤ 60:** SEO-Sektion verschärfen ("Zähle die Zeichen, kürze
   falls länger"); Schema-Description ebenfalls.
3. **Bezirk-Strenge:** KLASSIFIZIERUNG bezirkSlugs-Regel ergänzen: nur
   Slug einschließen, wenn Bezirksname oder Gemeinde-Synonym wörtlich im
   Quelltext; Regional-Sammelbegriffe (Hochsteiermark, Oststeiermark,
   Obersteiermark) reichen NICHT.

## Aus dem Scope ausgenommen

- gemeindeSynonyms-Re-Seed (separates Ingest-Thema — empty arrays sind
  CONF-02 Baseline-Issue)
- Legacy-Parity-Harness (verdoppelt Scope — Entscheidung nach Konvergenz)
- Post-hoc seoTitle-Truncation in `runMergedCall` (nur wenn Prompt-Fix
  versagt)
- Korrektur des Cron-GET-vs-POST-Runbook-Eintrags (kosmetisch, separat)
- Re-Cutover auf Vercel (separate Operator-Action nach 20/20)

## Budget

- Maximal 3 Harness-Iterationen (~$1.50–$6 Anthropic-Spend gesamt)
- Bei Plateau unter 20/20 nach 3 Iterationen: HALT + Konsultation
