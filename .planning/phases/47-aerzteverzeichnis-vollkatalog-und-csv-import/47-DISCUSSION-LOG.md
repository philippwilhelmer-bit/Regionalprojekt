# Phase 47: Aerzteverzeichnis Vollkatalog und CSV-Import — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 47-aerzteverzeichnis-vollkatalog-und-csv-import
**Areas discussed:** Feldkatalog + Datentypen, CSV-Format + Validierung, Bulk-Geocoding-Strategie, Dedupe + Update-Strategie

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Feldkatalog + Datentypen | Which deferred fields ship, in what shape | ✓ |
| CSV-Format + Validierung | Header, encoding, multi-value, errors | ✓ |
| Bulk-Geocoding-Strategie | Vercel 5-min cap vs Nominatim 1 req/s for ~2000 row imports | ✓ |
| Dedupe + Update-Strategie | Natural key, insert vs upsert, preview UX | ✓ |

**User's choice:** All four areas.

---

## Feldkatalog + Datentypen

### Sub-decision 1: Which deferred fields ship?

The initial framing (5 candidates from Phase 46's deferred list — öffnungszeiten, sprachen, kassen, barrierefrei, neuePatienten) was abandoned mid-discussion. User redirected to a completely different field set driven by the actual source data (`aerzte_steiermark_merged.csv`):

User specified the DB-target field set: `Bezirk, Fachrichtung, Name, Adresse, Telefonnummer, ArztNr, ProfilURL`.

**Result:** 5 of these already exist on the Doctor model (`Bezirk` → `bezirkId`, `Fachrichtung`, `Name`, `Adresse` → `address`, `Telefonnummer` → `phone`). Actually-new fields: `ArztNr` (NEW), `ProfilURL` (rename from `website`). All 5 originally-deferred Phase 46 fields dropped.

### Sub-decision 2: ArztNr constraint

| Option | Description | Selected |
|--------|-------------|----------|
| Unique + required | @unique String, required. Backfill needed for Phase 46 rows. | ✓ |
| Unique + optional | Nullable @unique. No backfill. Dedupe on WHERE NOT NULL. | |
| Not unique, optional | Informational only. Dedupe falls back to name+address. | |

**User's choice:** Unique + required.
**Notes:** Backfill strategy locked downstream as WIPE-AND-RELOAD (D-12) since Phase 46 only had placeholder rows.

### Sub-decision 3: Existing fields not in CSV (email, editorialNote, etc.)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep all, admin-only | Existing fields stay, CSV doesn't touch, editor enriches manually | ✓ |
| Drop editorial layer | Remove editorialNote/relatedArticleIds/isVerified | |
| Add to CSV | Extend CSV with optional editorial columns | |

**User then clarified mid-flow:**
- `enum` (kategorie) is gone, REPLACED by `fachrichtung` (which becomes the new enum)
- `website` is renamed to `profilUrl` (and IS in the CSV)

**Net:** `titel`, `email`, `editorialNote`, `relatedArticleIds`, `isVerified`, `mapImageUrl` stay admin-only. `kategorie` enum dropped entirely. `website` → `profilUrl` rename. `fachrichtung` promoted to closed enum.

### Sub-decision 4: fachrichtung enum or free-text?

| Option | Description | Selected |
|--------|-------------|----------|
| Closed enum | Prisma enum with explicit values; CSV-validated; deterministic | ✓ |
| Free-text String | Any string; typo risk; fuzzy JSON-LD branching | |
| Free-text + curated suggestions | Hybrid: String schema, dropdown suggestions | |

**User's choice:** Closed enum.

### Sub-decision 5: Enum value sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Paste CSV / distinct values | Direct from source, most accurate | ✓ |
| Drop CSV file in repo | Copy to .planning/, parse from there | |
| Claude proposes canonical Austrian set, user adjusts | Risk: future CSV value mismatch | |

**User's choice:** Pasted CSV path (`/Users/philipp/Downloads/aerzte_steiermark_merged - aerzte_steiermark_merged.csv.csv`).
**Notes:** Parsed → 51 distinct values, 3,577 rows, 13 Bezirke, ZERO dentists. Values catalog written to `47-aerzteverzeichnis-vollkatalog-und-csv-import/fachrichtung-values.txt` with row counts.

### Sub-decision 6: 51 enum values + filter UI

| Option | Description | Selected |
|--------|-------------|----------|
| Full 51-value enum + searchable dropdown | All values in enum, datalist-based filter UI | ✓ |
| Hierarchical: 15 groups + 51 leaves | Bucketed filter with sub-options | |
| Top-12 chips + "Weitere..." | Pragmatic chip set + overflow | |

**User's choice:** Full 51-value enum.

### Sub-decision 7: Name parsing

| Option | Description | Selected |
|--------|-------------|----------|
| Single `name` string ("Last, First") | Store as-is, zero new complexity | ✓ |
| Split into `surname` + `firstname` | Better JSON-LD, edge-case risk | |

**User's choice:** Single string.

---

## CSV-Format + Validierung

**Mode:** User exited plan mode and asked Claude to make reasonable calls without further questions. Decisions captured in CONTEXT.md D-06 through D-12 + D-18.

Alternatives Claude considered:

- **Encoding:** UTF-8 only (verified). Considered: tolerate Windows-1252 with auto-detection. Rejected: source CSV confirmed UTF-8, complexity not justified.
- **Header order:** exact-match required vs. flexible-order. Chose exact-match for fail-fast simplicity.
- **Required vs. optional cells:** Bezirk/Fachrichtung/Name/Adresse/ArztNr required, Telefonnummer/ProfilURL optional. Mirrors which fields the source CSV reliably populates.
- **Bezirk lookup:** by `Bezirk.name` exact match + alias map for the one mismatch (`"Graz-Stadt"` → `"Graz (Stadt)"` slug `graz`). Considered: rename DB to match CSV. Rejected: would touch unrelated Bezirk consumers.
- **Error reporting:** row-by-row conflicts table in dry-run (only conflicts shown, not all 3577 rows). Considered: full row table. Rejected: too much for UI.

---

## Bulk-Geocoding-Strategie

**Mode:** Claude's reasonable call. Captured in CONTEXT.md D-19 through D-24.

Decision drivers:
- **3,577 rows × 1.1s = ~65 minutes** of Nominatim calls
- **Vercel Hobby:** 5-min serverless function cap, 1 cron job per day (already consumed)
- **Phase 46 detail page** already degrades gracefully when `lat IS NULL` (no map pin)

Alternatives:

| Option | Outcome |
|--------|---------|
| Sync during import, row-cap | Caps at ~270 rows. Unworkable for 3,577. Rejected. |
| Require lat/lon in CSV | Source CSV has neither. Forces external pre-geocoding. Rejected (burden). |
| Background cron-driven | Needs >1 cron/day. Not on Hobby. Rejected (plan upgrade out of scope). |
| Lazy on first detail view | Surprising latency, unbounded concurrency. Rejected. |
| **Admin-triggered batch (selected)** | 200 rows/click within 5-min cap. Editor clicks ~18 times over days. Acceptable for one-time seed. |

---

## Dedupe + Update-Strategie

**Mode:** Claude's reasonable call. Captured in CONTEXT.md D-16, D-17, D-18.

Decision drivers:
- **arztNr** is unique-by-design (CSV column) and required (D-01) → perfect natural key
- Editorial fields exist (per "Keep all, admin-only" choice above) and must survive re-import

Decisions:
- **Mode:** Single mode = UPSERT. No "insert-only" toggle. Re-importing the CSV is the supported workflow.
- **Editorial preservation:** explicit allow-list of CSV-driven fields in update payloads. Editorial fields (titel, email, editorialNote, relatedArticleIds, isVerified, mapImageUrl, lat, lon) NEVER overwritten.
- **Address-change re-geocode trigger:** if `input.address !== existing.address`, set lat/lon/mapImageUrl back to null so batch geocoder picks them up. Mirrors Phase 46 D-31.
- **Within-batch dedupe:** last-write-wins on duplicate arztNr within same CSV, dry-run flags as warning (not row rejection).
- **Dry-run preview:** summary stats + collapsible conflicts table; full preview cache held server-side for 15 min keyed by session token; commit re-loads by token. Alternative (re-parse on commit) deferred to planner.

---

## Claude's Discretion

Explicitly punted to the planner in CONTEXT.md "Claude's Discretion":
- Specific UI layout of import preview (apply Phase 46 admin styling)
- Wording of German admin-facing error messages
- Vercel KV vs in-memory cache for dry-run preview state (depends on KV provisioning)
- Exact Fachrichtung identifier transform implementation
- `<form>` POST vs Server Action inline form for batch geocoder button

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:
- CSV export (bidirectional editor workflow)
- Bezirk-table edits via UI
- Bulk delete via CSV
- Adding `Zahnheilkunde` enum value (when dentist dataset arrives)
- Vercel plan upgrade for additional cron jobs
- `errorMessage`/`geocodingAttempts` columns on Doctor
- The 5 originally-deferred Phase 46 fields (öffnungszeiten/sprachen/kassen/barrierefrei/neuePatienten) — explicitly NOT coming back
- Public JSON API for doctor data
