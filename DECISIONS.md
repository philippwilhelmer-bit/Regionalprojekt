# Architekturentscheidungen

Format pro Entry:
- **Datum / Kontext / Entscheidung / Begründung / Verworfene Alternativen / Konsequenzen**

---

## 2026-05-12 — Phase 43 Cutover-Gate FAILED → Rollback-Empfehlung auf Legacy-Pfad

**Kontext:**
Phase 43 (AI Pipeline Quick Wins) hat den merged single-call Pfad
(`runMergedCall` in `src/lib/ai/merged.ts`) hinter dem Env-Flag
`AI_USE_MERGED_CALL` ausgeliefert. Code-Default in `pipeline.ts:151` ist
`'true'`; in Vercel-Production ist das Flag nicht gesetzt, also läuft der
merged-Pfad seit dem Merge auf `main` (~2026-05-11 13:54+02) bereits live
in Produktion. Der laut `43-CONTEXT.md` vorgesehene Cutover-Gate
(Token-Baseline + 20/20 Fixture-Replay) wurde VOR der Deployment
nicht ausgeführt.

**Beobachtung (2026-05-12, Cutover-Gate nachgeholt):**

*Step 1 — Token-Baseline aus historischer `PipelineRun`-Tabelle:*
- Legacy (24 Runs, 2026-04-15 bis 2026-05-08, 182 Artikel):
  Ø **1884 Input-Tokens / Artikel**, Ø 233 Output-Tokens / Artikel.
- Merged in Prod (1 Run #52, 2026-05-12, 6 Artikel):
  Ø **1860 Input-Tokens / Artikel**, Ø 189 Output-Tokens / Artikel.
- Resultierende Input-Reduktion: **1,3 %** (Ziel laut v3.2 ROADMAP: ≥ 50 %).

Strukturelle Erklärung für die fehlende Reduktion:
1. **Anthropic Prompt-Cache TTL = 5 min.** Vercel-Hobby-Cron läuft 1× pro
   Tag → jeder Run startet mit kaltem Cache, der theoretische
   Cache-Read-Rabatt (~90 % auf den System-Prefix) fällt komplett weg.
2. **Legacy-Pfad hat Early-Exit-Vorteil.** Artikel, die in Step 1
   (Tag) als irrelevant klassifiziert werden, überspringen Step 2
   (Write) → ~1300 Tokens Ersparnis pro abgewiesenem Artikel. Der
   merged Pfad läuft den vollen Prompt unbedingt.
3. **`totalInputTokens` zählt `inputTokens + cacheCreationTokens`** und
   schließt `cachedInputTokens` aus (Phase 43 ist schema-frei,
   `totalCachedInputTokens` lebt nur in-memory in `pipeline.ts:187`).
   Selbst mit Cache-Treffern wäre der Vorteil im persistierten Wert
   unsichtbar — Phase 44 (TLM-01..04) erweitert das Schema.

*Step 2 — Replay-Harness `scripts/ai-replay-fixtures.ts` gegen die
echte Anthropic-API mit `claude-haiku-4-5-20251001`:*

Ergebnis: **9/20 passed** (Pass-Schwelle laut `43-CONTEXT.md`: 20/20,
jede Einzel-Fehl­bestehung blockiert Merge).

Fehlerkategorien (11 Failures):
- **Faktentreue (9):** body fehlt zentrale Source-Fakten — f01 (A2,
  Auffahrunfall), f04 (Hartberg), f05 (Knittelfeld), f08 (Pensionsreform),
  f09 (Knittelfeld, OTS-Bleed-Marker), f16 (Ladepunkte), f17 (Landtagswahl),
  f18 (Mariazell), f20 (Gamlitz, Weinkultur).
- **SEO-Title-Overflow (2):** f12 (61 Zeichen, +1), f15 (71, +11) gegen
  `seoTitleMaxChars: 60`.
- **Tag-Halluzination (1):** f18 → `["bruck-muerzzuschlag","liezen"]`
  statt erwartet `["bruck-muerzzuschlag"]`. Mariazell liegt in NÖ; die
  Liezen-Tag-Zuweisung ist ein Quality-Regress.

Triage von 6 Fixtures (f01/f08/f09/f12/f15/f18) ergibt: **die
Mehrheit der Failures sind echte Quality-Regresse**, keine
über­strengen Invariants. Der merged Prompt elidiert systematisch
quellen­zentrale Begriffe zugunsten generischer Umschreibungen.

*Step 3 — AIPL-10 SQL (`UPDATE Article SET status='FETCHED' WHERE
status='TAGGED'`):* 1 Zeile aktualisiert (Article id=181
"Verkehrsunfall zwischen Pkw und Fahrrad", createdAt
2026-04-29). Idempotent; 0 verbleibende TAGGED-Zeilen.

**Entscheidung (vorgeschlagen, abhängig vom Vercel-Env-Flip durch
Operator):**

Rollback der Production auf den Legacy-Pfad durch Setzen von
`AI_USE_MERGED_CALL=false` als Vercel-Production-Env-Variable (UI:
Settings → Environment Variables → Add Production →
`AI_USE_MERGED_CALL=false` → Redeploy). Der Code beider Pfade bleibt
in tree (`pipeline.ts` verzweigt im per-article-Loop), Schema ist
unverändert (Phase 43 ist schema-frei), kein DB-Rollback nötig.

**Begründung:**
- Quality-Regress in der echten API-Antwort ist eindeutig (Source-Fakten
  fallen weg, nicht stilistische Glättung).
- Token-Cost-Win ist nicht nachweisbar (1,3 % bei N=1, Cache-TTL
  blockiert strukturell unter 1/Tag-Cron).
- Rollback ist eine Vercel-Env-Variable, sofort reversibel.
- Bereits generierte merged-Artikel bleiben in der DB unangetastet —
  nur künftige Cron-Runs nutzen wieder Legacy.

**Verworfene Alternativen:**

| Alternative | Verworfen weil |
| ----------- | -------------- |
| Merged-Prompt sofort tunen, gate-Failures fixen, dann erneut messen | Mehrere Stunden Prompt-Iteration plus Anthropic-Spend, ohne Gewissheit dass der Cache-TTL-Bottleneck überhaupt ≥ 50 % zulässt. Höhere Risiko-Rendite-Asymmetrie als sofortiger Rollback. |
| Fixture-Invariants relaxen, gate-Failures akzeptieren | Triage zeigte: 9/11 Failures sind echte Regresse, nicht über­strenge Invariants. Das Relaxen würde die Quality-Gate zur Selbst­bestätigung degradieren. |
| Status quo lassen (merged Pfad live), Phase 44 TLM-Schema zuerst | Setzt Reader weiter Quality-Regressen aus, während Telemetrie aufgebaut wird. Phase 44 löst das Mess­problem, nicht das Quality-Problem. |
| Vercel-Cron auf < 5 min hochdrehen, um Prompt-Cache nutzbar zu machen | Hobby-Plan limitiert auf 1/Tag. Pro-Plan-Upgrade ist eine andere Entscheidung, nicht Teil dieses Gates. Auch dann adressiert das nur (1), nicht die Quality-Regresse. |

**Konsequenzen:**
- Phase 43 ist NICHT als "vollständig akzeptiert" abzuschließen, solange
  der Gate nicht 20/20 + ≥ 50 % erreicht.
- Phase 45 (Quality-Eval-Harness) wird relevanter — die Triage zeigt,
  dass ein laufender Quality-Gate über die ganze v3.2 hinweg gebraucht
  wird, nicht nur als one-shot.
- f12/f15 SEO-Title-Overflow ist ein leichter Prompt-Tune (hartes
  `seoTitle.length <= 60` im Tool-Schema oder im System-Prompt) und
  kann unabhängig vom Rollback in einem späteren Plan adressiert
  werden.
- Phase 44-Reihenfolge bleibt unverändert (TLM-01..04 vor TLM-05..07
  bzw. Batches), aber die kritische Annahme "merged-Pfad ist
  Qualitäts­neutral" ist falsifiziert; Phase 44 sollte das
  Token-Telemetry-Schema so designen, dass es auch im Legacy-Pfad
  läuft.

**Artefakte:**
- `/tmp/baseline.json` — historische `PipelineRun`-Daten + post-cutover
  Run #52
- `/tmp/replay-v3-cutover-fail.log` — Harness-Output mit allen 11 Failures

---
