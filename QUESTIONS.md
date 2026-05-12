# Offene Fragen

## Q1: PROGRESS.md existiert nicht — anlegen oder ignorieren? — RESOLVED

**Antwort**: Anlegen als separater Vor-Commit mit Message
`chore: add PROGRESS.md scaffold`. Initialinhalt: `# Progress Log\n`.

---

## Q1 (Originalfrage):

AGENTS.md "Definition of Done" verlangt "PROGRESS.md aktualisiert".
AGENTS.md "Scratchpad-Dateien" beschreibt das Format
`- [HH:MM] <Beschreibung> (commit: <sha>)`.
AGENTS.md "Commit-Discipline" verlangt: "Nach Commit: PROGRESS.md mit
Commit-SHA aktualisieren".

Aber: PROGRESS.md existiert noch nicht im Repo.

TASK.md erwähnt PROGRESS.md gar nicht und schließt "KEIN Anfassen
anderer Dead-Code-Kandidaten" aus — meint das nur Code-Dateien, oder
auch das Anlegen von Scratchpad-Files?

Optionen:
- (a) PROGRESS.md neu anlegen und mit dem Cleanup-Eintrag starten
- (b) PROGRESS.md ignorieren, weil nicht in TASK.md spezifiziert
- (c) PROGRESS.md anlegen, aber als separaten Commit (`docs: bootstrap PROGRESS.md`)
      VOR dem Refactor-Commit

## Q2: Conflict zwischen AGENTS.md-DoD und TASK.md-Akzeptanzkriterien — RESOLVED

**Antwort**: Verbindlich ist AGENTS.md (DoD). TASK.md wird um
`npm run typecheck läuft fehlerfrei` erweitert. Erweiterung per
`git commit --amend` des bestehenden TASK.md-Commits, kein neuer Commit.

---

## Q2 (Originalfrage):

AGENTS.md DoD listet als verbindlich:
- "Funktioniert für den in TASK.md spezifizierten Happy Path"
- "Keine ungenutzten Imports, kein toter Code, keine TODO-Kommentare"
- "Conventional Commit"
- "PROGRESS.md aktualisiert"
- "Tests: pure functions als Unit-Test, DAL/Actions mit pglite, …"

TASK.md ACs listen NUR:
- Datei gelöscht
- `npm run build` grün
- `npm run test` grün
- keine `@/lib/admin/auth`-Imports mehr
- Commit-Message

Welche Liste hat Priorität, wenn TASK.md kürzer ist als AGENTS.md DoD?
Ist TASK.md eine Teilmenge der DoD (alle DoD-Punkte gelten implizit),
oder eine Override (nur die ACs in TASK.md zählen, DoD ist Default für
Tasks die keine ACs spezifizieren)?

Konkrete Folge: muss `npm run typecheck` (aus `package.json`) auch laufen,
auch wenn TASK.md nur build+test nennt?

## Q3: Co-Authored-By-Trailer in der Commit-Message? — RESOLVED

**Antwort**: Trailer beibehalten, analog zum Vor-Commit `7b6e901`.

---

## Q3 (Originalfrage):

TASK.md verlangt wörtlich:
> Commit mit Message: "refactor: remove unused auth.ts barrel"

Der vorhergehende Commit auf diesem Branch (`7b6e901`, "docs: add TASK.md …")
hatte einen `Co-Authored-By: Claude Opus 4.7 (1M context)`-Trailer.

Soll der Refactor-Commit:
- (a) wörtlich nur die Title-Zeile aus TASK.md tragen, kein Trailer
- (b) Title aus TASK.md + Co-Authored-By-Trailer (analog vorheriger Commit)

AGENTS.md sagt zu Trailern nichts.

## Q4: Tests, die das Barrel indirekt benutzen? — RESOLVED

**Antwort**: Baseline-Run von `npm run test`, `npm run typecheck` und
`npm run build` VOR der Löschung. Ergebnis in PROGRESS.md festhalten.
Danach löschen, denselben Drei-Schritt-Run, dann vergleichen.
Nur wenn vorher und nachher gleich grün, wird committet.

---

## Q4 (Originalfrage):

`grep` hat keine Imports von `@/lib/admin/auth` gefunden — nur direkte
Imports auf `auth-node` / `auth-edge`. Soll der Akzeptanztest
"`npm run test` läuft fehlerfrei durch" über alle Tests laufen, oder
genügt eine fokussierte Auswahl?

Hintergrund: das Repo hat pglite-Setup (`src/test/setup-db.ts`), das beim
Vitest-Run ein In-Memory-Postgres hochfährt — falls die Test-DB-Init
gerade kaputt sein sollte (was wir nicht wissen), würde ein Voll-Run
fehlschlagen aus Gründen, die mit dem Task nichts zu tun haben.

Variante (a): Voll-Run `npm run test` (was TASK.md wörtlich sagt)
Variante (b): zusätzlich vor dem Refactor einen Baseline-Run, um
              Vortbestehende Fehler vom Task-Effekt zu trennen

---

## Q5 (offen, für Phase 45): Sollen die drei Baseline-Failures (afterEach-Import in map-actions.test.ts:182, ArrayBuffer-Typ-Mismatch in mapgen.test.ts:193, Plus_Jakarta_Sans-Mock-Gap in root-layout-adsense.test.ts, bezirke-Synonym-Seeding in bezirke.test.ts CONF-02) in einem eigenen Task gefixt werden, bevor Phase 45 weitergeht?

## Q6 (offen): PROGRESS.md-Updates - eigene docs(progress)-Commits (aktuelle Praxis) oder im jeweiligen Refactor-Commit gefoldet?

## Q7 (offen): tsconfig.tsbuildinfo-Cache routinemäßig vor jedem Verifikations-Run löschen, oder nur bei Bedarf?
