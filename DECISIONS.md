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

## 2026-05-12 — Merged-Call-Tuning erschöpft → v3.2 als "Merged-Call mit Haiku 4.5 + 50% Kostenziel infeasible" geschlossen

**Kontext:**
Nach dem Rollback (Entry oben) drei Tuning-Iterationen plus ein
Sonnet-4.6-Experiment durchgeführt. Ergebnis: das ≥ 50 % Kostenziel
der v3.2-Roadmap ist mit Haiku 4.5 als merged-call-Modell strukturell
nicht erreichbar bei gleichzeitig ausreichender Faktentreue.

**Beobachtung — 4 Harness-Iterationen mit `scripts/ai-replay-fixtures.ts`:**

| Iter | Modell    | Temperatur | Pass | Commit  |
| ---- | --------- | ---------- | ---- | ------- |
| Base | Haiku 4.5 | default    | 9/20 | (Phase 43-04) |
| 1    | Haiku 4.5 | default    | 10/20| 25007cc |
| 2    | Haiku 4.5 | 0          | 7/20 | 27bc1f3 |
| 3    | Haiku 4.5 | 0          | 7/20 | 6a0c63f |
| 4    | Sonnet 4.6| 0          | 16/20| (uncommitted env-override) |

Iter-1-Änderungen: FAKTENTREUE-Regel in UMSCHREIBUNG, KURZE QUELLEN,
seoTitle harte Grenze, Bezirk-Strenge gegen Regional-Sammelbegriffe
(System-Prompt-Ebene).
Iter-2: `temperature: 0` global gesetzt — entfernt Sampling-Rauschen,
exponiert dafür Haikus deterministische Paraphrasierungs-Neigung
("A2" → "Autobahn", "Auffahrunfall" → "Unfall", "Pensionsreform" →
"Reform der Altersvorsorge").
Iter-3: Regeln in die Schema-Field-Descriptions (`body`, `seoTitle`,
`isStateWide`) verschoben — Tool-Use-Modelle gewichten Field-Level-
Descriptions stärker als das System-Prompt für Per-Field-Generierung.
Trotzdem kein Sprung.
Iter-4: AI_MODEL_OVERRIDE=claude-sonnet-4-6, sonst identisch zu
Iter-3. Sprung auf 16/20.

**Verbleibende Failures auf Sonnet 4.6 (4):**
- f05: `mentionsPrivateIndividual: got false, expected true` —
  dokumentierter Regression-Marker, sollte laut 43-04-SUMMARY
  bei Phase-45-Officeholder-Exclusion flippen. Sonnet trifft die
  Phase-45-Entscheidung implizit; bei Bewertung mit aktualisierten
  Markern: real 17/20.
- f08: body fehlt "Pensionsreform" — Paraphrase-stur auch auf Sonnet.
- f10: body fehlt "Skiweltcup" — Paraphrase-stur auch auf Sonnet.
- f18: bezirk-over-tag `["bruck-muerzzuschlag","liezen"]` — körperliche
  Faktentreue (Mariazell im body) ist gewonnen, Tag-Halluzination bleibt.
  Hochsteiermark-Assoziation grenzwertig-defensibel; wenn als soft-tag-
  Toleranz akzeptiert: real 18/20.

**Entscheidung:**

v3.2 Merged-Call-Arbeit wird als "infeasible mit Kostenziel" geschlossen:
- Production bleibt auf Legacy (Vercel `AI_USE_MERGED_CALL=false`, gesetzt
  am 2026-05-12, verifiziert in PipelineRun #53).
- Merged-Call-Code bleibt im Tree (dormant), inklusive der drei Tuning-
  Iterationen — als Startpunkt für eine spätere Re-Cutover-Attempt nach
  Phase 44 Telemetrie + Phase 45 Quality-Loop.
- Das v3.2 "≥ 50 % Input-Token-Reduktion"-Erfolgskriterium wird NICHT
  als erreicht markiert; v3.2 muss in PROJECT.md/ROADMAP.md mit dieser
  Realität reflektiert werden (separater Edit, nicht in dieser Commit-
  Welle).

**Begründung:**
- Drei Prompt-Iterationen konvergierten nicht (9 → 10 → 7 → 7).
- Sonnet-Sprung auf 16/20 zeigt: die verbleibenden Haiku-Failures sind
  Modell-Kapazitäts-Grenzen, nicht Prompt-Engineering-Grenzen.
- Sonnet 4.6 kostet ~5× Haiku/Token → switch auf Sonnet macht die Input-
  Kosten gegenüber Legacy *steigen*, trotz merged-call-Architektur-Vorteils.
  Das v3.2-Hauptziel ist damit defeatet.
- Production-Sicherheit ist bereits hergestellt (Run #53 verifiziert
  Legacy-Routing). Kein operationaler Druck.
- "Honest closure" — die Annahme, dass merged-call mit Haiku 4.5 das
  Kostenziel ohne Quality-Regress trifft, ist falsifiziert. Eine
  zukünftige Re-Attempt sollte:
  (a) auf einer model-class-Entscheidung beruhen (Haiku 4.7 Release?
      Sonnet-mit-Caching-Strategy? Hybrid Haiku-tag + Sonnet-write?),
  (b) Phase-44-Telemetrie als Kostentelemetrie-Basis nutzen (sieht
      auch cached_input_tokens separat),
  (c) Phase 45 Quality-Loop als kontinuierliche Gate-Maschinerie
      nutzen, nicht als one-shot 20/20.

**Verworfene Alternativen:**

| Alternative | Verworfen weil |
| ----------- | -------------- |
| Re-Cutover auf Sonnet 4.6 + Marker-/Borderline-Relaxierung | Defeatet das v3.2 Kostenziel komplett; net-negativ auf Cost-pro-Artikel; Re-Cutover ohne Cost-Win ist eine Architektur-Änderung ohne Business-Begründung. |
| Hybrid: Haiku-Tag + Sonnet-Rewrite (Two-Call) | Defeatet das merged-call-Design von 43-01. Größerer Scope, neuer Plan nötig, Kostenwin unklar (vermutlich +2-3× gegenüber Legacy). Kein No-Brainer; verdient eigene Phase mit Research. |
| Eine weitere Sonnet-Iteration auf f08/f10/f18 | Würde maximal auf 18-20/20 schließen, ohne das Hauptproblem (Sonnet-Kostenziel) zu adressieren. Mehr Ausgaben, gleiche Architektur-Frage offen. |
| Stilllegung des Merged-Call-Codes (Removal aus dem Tree) | Code bleibt nützlich für künftige Re-Attempts oder Phase-45-Quality-Loop. Removal ist destruktive Aktion ohne Nutzen. |

**Konsequenzen:**

- v3.2-Roadmap: das ≥ 50 % Reduktion-Erfolgskriterium muss als
  "deferred" markiert werden; v3.2 schließt mit "AI Pipeline Quick
  Wins" geliefert (43-01..04 Code-Artefakte, 43-04 Fixtures), aber das
  primäre Business-Ziel nicht erreicht.
- Phase 44 Token-Telemetry-Schema MUSS auch im Legacy-Pfad Daten
  loggen — das Schema-Design darf nicht merged-only sein.
- Phase 45 Quality-Eval-Harness sollte direkt auf den 20 Fixtures
  aufbauen + Model-Comparison-Mode (`AI_MODEL_OVERRIDE`) als Built-in
  haben — der Mechanismus existiert jetzt im Code.
- Spätere Re-Attempt-Trigger: (a) neues Haiku-Release mit besserer
  Instruction-Following, (b) Anthropic-Cache-TTL-Änderung, (c) Vercel-
  Pro-Cron-Plan-Entscheidung, (d) Quality-Toleranz-Diskussion mit
  Domain-Eigentümer (sind Synonyme wie "Autobahn" für "A2" wirklich
  ein Reader-Quality-Problem?).

**Artefakte:**
- `/tmp/replay-iter1.log` (10/20, Haiku, default temp)
- `/tmp/replay-iter2.log` (7/20, Haiku, temp=0)
- `/tmp/replay-iter3.log` (7/20, Haiku, temp=0, schema-edits)
- `/tmp/replay-iter4-sonnet.log` (16/20, Sonnet 4.6, temp=0)
- Commits: 25007cc, 27bc1f3, 6a0c63f (alle Code-Änderungen bleiben in tree, dormant)

---

## 2026-05-16 — Phase 47: papaparse als CSV-Parser-Dependency

**Datum:** 2026-05-16

**Kontext:**
Phase 47 (Ärzteverzeichnis Vollkatalog + CSV-Import) benötigt einen CSV-Parser für den
Bulk-Import der 3.577-zeiligen Ärztekammer-Steiermark-CSV. Die Quelldatei enthält
mehrstellige quoted-value-Felder (z. B. `"Hals-, Nasen- und Ohrenheilkunde"` — Komma
innerhalb von Anführungszeichen, D-07). Ein naiver `split(',')` würde diese Felder
fälschlicherweise aufteilen.

**Entscheidung:**
`papaparse` (runtime) v5.5.3 + `@types/papaparse` (devDependency) v5.5.2 werden dem Projekt
hinzugefügt. AGENTS.md Anti-Bloat-Regel erfordert diesen Eintrag.

**Begründung:**
- papaparse ist der npm-Standard für Browser- und Node-CSV-Parsing (>10 Jahre Trackrecord,
  >5M Downloads/Woche, MIT-Lizenz, zero runtime dependencies).
- Sync-API (`Papa.parse(string, { header: true })`) passt perfekt zu Server-Action-Use-Case
  (kein Streaming-Overhead für 3.577 Zeilen).
- BOM-Stripping (`csvText.replace(/^﻿/, '')`) muss einmalig vorangestellt werden,
  dann liefert papaparse saubere Objekte (D-07).
- `dynamicTyping: false` hält alle Felder als `string` — verhindert ungewollte Typ-Konversion
  bei ArztNr-Feldern, die rein numerisch aussehen können (Pitfall 4, RESEARCH.md).
- Einzige neue Runtime-Dependency in Phase 47 — minimaler Anti-Bloat-Impact.

**Verworfene Alternativen:**

| Alternative | Verworfen weil |
| ----------- | -------------- |
| `csv-parse` (node-csv) | Strikte Streaming-API, async-Iterator overhead für einen einmaligen 3.577-Zeilen Sync-Parse; größerer API-Footprint ohne Mehrwert. |
| Hand-rolled `split(',')` + State-Machine | AGENTS.md "Don't Hand-Roll": Multi-Line quoted CSV-Strings (D-07: `"Hals-, Nasen- und Ohrenheilkunde"`) erfordern korrekte FSM-Implementierung — re-created known footguns. Keine Linting/Test-Basis für Edge-Cases. |

**Referenzen:**
- D-07 (CONTEXT.md): CSV-Format enthält Kommas innerhalb von Anführungszeichen
- RESEARCH.md § Standard Stack (lines 30-69): Installations- und Versions-Verifikation
- RESEARCH.md § Pitfall 1 (CSV multi-line): quoted-value edge cases
- RESEARCH.md § Anti-Patterns: Warnung gegen Hand-Roll-Parser

---
