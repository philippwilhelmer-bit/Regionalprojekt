# Phase 46: Ärzteverzeichnis (Doctor Directory) — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Milestone:** v3.3 Directory Expansion (new — not yet scaffolded)

## Phase Boundary

Build a public doctor directory under `/aerzte` for Loden & Leute. Users browse Allgemeinmediziner, Fachärzte and Zahnärzte by Bezirk and Fachrichtung; each entry has a public detail page with a Nominatim-geocoded map pin, editorial notes, optional cross-links to articles and a verification badge. Editorial team owns the data via admin CRUD (`/admin/aerzte`). A phase-local design token system is introduced additively in `globals.css` — the rest of the site is not touched.

**In scope (full MVP per user choice "Vollständig"):**
- Prisma `Doctor` table + admin CRUD
- Public list `/aerzte` with Bezirk + Kategorie + Fachrichtung filter
- Public detail page `/aerzte/{publicId}/{slug}` with map
- Editorial notes (Markdown), optional `relatedArticleIds`
- Verification badge
- Nominatim geocoding at admin-save (single call per save → rate-limit safe)
- Additive new design tokens for directory pages only

**Out of scope (deferred):**
- Apotheken (separate schema: Notdienst, Öffnungszeiten-Slots) → possible Phase 47
- User-submitted entries / crowd-sourcing
- User ratings / reviews
- AI-tagged article→doctor cross-linking (manual only for MVP)
- Doctor→article back-reference (one-way for MVP)
- Multi-Bezirk practice support (single `bezirkId` per entry)
- Global migration of the new design tokens (phase-local only — possible separate refactor phase)
- Bulk CSV import (single-entry CRUD only; pragmatic add-on TBD plan-phase)

## Implementation Decisions

### Datasource
- **Editorial CRUD in admin** — no external API, no scraping, no public submit.
- New Prisma table `Doctor`; admin route `/admin/aerzte` mirrors `/admin/articles` patterns.
- Server-Action-Trinity per AGENTS.md: `xxxDb(db, input)` / `xxxAction(input)` / `xxxForm(formData)`.
- DI via duck-typing (`'$connect' in clientOrOptions`), pglite-injectable for tests.

### Eintragstypen
- All three doctor categories live in one `Doctor` table, differentiated by enum `kategorie`:
  - `ALLGEMEINMEDIZIN`
  - `FACHARZT` (free-text `fachrichtung` column for specialty label)
  - `ZAHNARZT`
- Apotheken NOT in this phase.

### Routing
- `/aerzte` — public list (Server Component, `export const dynamic = 'force-dynamic'`).
- `/aerzte/{publicId}/{slug}` — detail page, slug via existing `slugify()` from `lib/reader/slug`, canonical-redirect on mismatch (same pattern as `/artikel/[publicId]/[slug]`).
- Filters as query params: `?bezirk=graz&kategorie=facharzt&fachrichtung=orthopaede`.
- No new BottomNav-Tab (would break the 2-tab decision) — `/aerzte` discoverable via AppBar nav-link + Footer.
- Admin: `/admin/aerzte` (list + new) and `/admin/aerzte/[id]/edit` (edit).

### Geocoding
- `address: string` + `lat: number | null` + `lon: number | null` columns on `Doctor`.
- Geocode at admin-save in Server Action via Nominatim — single call per save = rate-limit safe.
- Reuse the existing Nominatim helper from `lib/images/geocode.ts`; pattern: `await sleep(1100)` between bulk calls. Single-save needs no sleep.
- If Nominatim fails: save entry with `lat/lon = null`, surface a warning in admin UI ("Adresse konnte nicht geokodiert werden"). Detail-Page falls back to address-only display, no map pin.

### Map View on Detail Page
- Map decision deferred to plan-phase: **option A** static map via existing `lib/images/mapgen.ts` pipeline (no new dep), **option B** Leaflet client component (new dep, interactive zoom/pan). Recommendation in plan: static for MVP, interactive as later enhancement.

### Editorial Notes + Article Cross-Links
- `editorialNote: string | null` — Markdown rendered on detail page (use existing markdown-to-paragraphs pattern from article detail).
- `relatedArticleIds: string[]` — manual curated list, displayed as "Mehr zum Thema" block on detail page using `EditorialStackCard` variant=row.
- One-way only: article detail page does NOT show "ein Arzt aus diesem Artikel".

### Verification Badge
- `isVerified: boolean` on `Doctor`, default `false`.
- Admin toggles via CRUD UI.
- Public list + detail page render a small badge when `true` (Eyebrow-style).

### Bezirk-Zuordnung
- Single `bezirkId: string` per `Doctor`, foreign key to `Bezirk` table.
- Multi-Bezirk-Praxen out of scope.

### Design Tokens — Phase-Local
- Phase-local design system spec lives in `.planning/phases/46-aerzteverzeichnis/DESIGN.md`.
- Master `DESIGN.md` at project root is NOT touched.
- New tokens added to `globals.css` under a namespace prefix (`--dir-*` or similar — concrete prefix decided in plan-phase) so they coexist with live tokens.
- Only `/aerzte` and `/admin/aerzte` pages may reference the new tokens; rest of site stays on live tokens.
- Reconciliation table in phase-local DESIGN.md explicitly flags which tokens are identical to live (no work), which are renames (use existing live var), and which are new (add to globals.css).
- YAML-vs-prose discrepancies in the supplied DESIGN.md (e.g. `background` YAML `#faf9f5` vs. prose `#FCFBF7`; `surface` YAML `#f4f4f0` vs. prose `#F4F2EB`) flagged in DESIGN.md reconciliation — assumed authoritative: **YAML wins** (matches live `--color-parchment`/`--color-surface` values).

## Open Questions for Plan-Phase

1. **Felder-Vollkatalog** beyond name/kategorie/fachrichtung/adresse/lat/lon: which of `email`, `website`, `telefon`, `öffnungszeiten` (text or structured?), `sprachen[]`, `kassen[]` (welche Kassen-Enum?), `barrierefrei: boolean`, `neuePatienten: boolean` are MVP?
2. **Detail-Page Map**: static (mapgen) vs. interactive (Leaflet) — concrete decision + dependency-add review.
3. **Verzeichnis-Suche**: only Filter-Chips (Bezirk + Kategorie + Fachrichtung) or additionally Full-Text search on name?
4. **SEO**: emit `MedicalBusiness` JSON-LD per detail page (also `Dentist` schema for `ZAHNARZT`)?
5. **Listen-Sortierung**: alphabetisch by name? `isVerified=true` zuerst? both?
6. **Bulk-Import**: any out-of-scope override (e.g. CSV import to seed Graz initially)?
7. **AppBar-Nav**: add "Ärzte" as new nav-link in `LodenAppBar` desktop nav + mobile drawer? Footer-link only?
8. **Sitemap + RSS**: include doctor URLs in `sitemap.ts`? RSS feed for doctors irrelevant — skip.
9. **DESIGN.md Token-Prefix**: `--dir-*`? `--directory-*`? Naming bikeshed.

## Risks & Considerations

- **Datenpflege-Aufwand**: Steiermark hat geschätzt 2000+ aktive Ärzte. Manuelle Pflege ist Vollzeit. → MVP-Empfehlung: Start mit Graz + 2-3 angrenzenden Bezirken; organisches Wachstum.
- **Aktualität**: Adressen / Sprechzeiten veralten. Kein Auto-Sync → manuelle Pflege-Hygiene + Editor-Hinweis "Stand: TT.MM.JJJJ" pro Eintrag empfohlen.
- **Rechtliche Risiken**: Falsche Daten in Arztverzeichnis können Haftung auslösen → klarer Disclaimer ("Angaben ohne Gewähr") im Footer der Detail-Page; `isVerified` ist Signal, keine Garantie.
- **Nominatim Rate-Limit**: 1 req/s. Einzel-Save ist OK, jeder Bulk-Import-Pfad muss eigene Sleep-Logik haben (siehe `lib/images/geocode.ts`).
- **Phase 44/45 Orthogonalität**: Ärzteverzeichnis fasst `Article`-Tabelle nicht an, daher kein Konflikt mit v3.2-Cost-Engine-Tests. Sanity-Check beim Plan-Phase: Doctor-Migration ist additive.
- **Test-Parallelismus-Flakiness** (pglite, dokumentiert in PROGRESS): Doctor-Tests folgen denselben Patterns (Articles-Tests-Stil); evtl. dieselbe Flakiness erbt — Plan-Phase plant Isolated-Test-Runs falls nötig.
- **Sitemap-Skalierung**: Falls Hunderte Doctor-URLs hinzukommen, Sitemap-Größe prüfen (Limit 50k URLs / 50 MB — weit weg).
