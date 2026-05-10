# Phase 41: Location Intelligence and Full Pipeline - Research

**Researched:** 2026-04-13
**Domain:** Location extraction (regex + LLM), Nominatim geocoding with Postgres cache, end-to-end cron integration
**Confidence:** HIGH (Nominatim API verified via official docs; project patterns verified directly from source; LLM pattern from existing Step 1 code)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-01 | System extracts location (city/town/street) from article text using regex patterns for Austrian place names and Bezirk names from config | Seed bezirke data provides canonical names; gemeindeSynonyms provide alias coverage; regex priority rules documented below |
| MAP-02 | System geocodes extracted location via Nominatim with `countrycodes=at`, caches results in Postgres to avoid rate limit bans | Nominatim API verified, `type` field maps to existing ZOOM_BY_LOCATION_TYPE; cache schema designed as standalone table |
| CMS-02 | System uses LLM fallback to extract location when regex finds nothing and article has meaningful geographic content | Anthropic SDK pattern from step1-tag.ts; haiku model; `output_config` JSON schema approach confirmed |
| INTG-01 | System automatically generates map image after AI article generation during cron ingestion pipeline | Integration point identified in `pipeline.ts` after step2-write; `generateMapImage` already accepts `locationType`; cron route stays unchanged |
</phase_requirements>

---

## Summary

Phase 41 adds three new capabilities that bridge Phase 40's tile infrastructure to the live cron pipeline:

**Location extraction (MAP-01):** A `extractLocation(text)` function tries regex first — scanning for Bezirk names (from `steiermarkBezirke` seed data) and city synonyms. This is fast, zero-cost, and sufficient for most ORF/OTS articles that name places explicitly.

**LLM fallback (CMS-02):** If regex yields nothing and the article body has more than a trivial length (indicating geographic content is plausible), a Haiku call using the same `output_config` JSON schema pattern from `step1-tag.ts` asks the LLM for a place name. The result is a plain string or null — no Bezirk classification needed here.

**Nominatim geocoding with Postgres cache (MAP-02):** A dedicated `GeocodingCache` table stores `(normalizedName, lat, lon, locationType, cachedAt)`. Before every Nominatim HTTP call, the system checks this table. On a cache miss, it calls `https://nominatim.openstreetmap.org/search` with `q={name}&countrycodes=at&format=jsonv2&limit=1`, extracts `lat`, `lon`, and `type`, stores the result, and returns it. Nominatim's `type` field returns OSM place tag values — `city`, `town`, `village`, `suburb`, etc. — which map directly to the existing `ZOOM_BY_LOCATION_TYPE` constant in `mapgen.ts`. The `1 request/second` rate limit is satisfied by the cache (articles with the same place name never issue a second HTTP request) and by the fact that the cron runs at a low frequency (~1 article/day in production).

**Pipeline integration (INTG-01):** The integration point is inside `pipeline.ts`'s per-article loop, after step 2 completes and before writing `WRITTEN` status. The pattern is an inner try/catch matching the existing MAP-08 isolation pattern from Phase 40. If `article.imageUrl` is already non-null, map generation is skipped entirely.

**Primary recommendation:** Create `src/lib/images/locextract.ts` (location extraction + LLM fallback) and `src/lib/images/geocode.ts` (Nominatim + Postgres cache), then integrate both into `pipeline.ts` with a single guarded call to `generateMapImage`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Anthropic SDK | `^0.80.0` (installed) | LLM location extraction fallback (CMS-02) | Already installed; same model and `output_config` pattern as step1-tag.ts |
| `@prisma/client` | `^6.19.2` (installed) | GeocodingCache table reads/writes | Already the project ORM; no new dependency needed |
| Node.js `fetch` | built-in | Nominatim HTTP calls | Already used in mapgen.ts fetchTileWithRetry |
| `sharp` | `0.33.5` (pinned, installed) | Map image generation via existing `generateMapImage` | Phase 40 output — no changes needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^2.1.9` (installed) | Unit tests for extractor, geocoder, and integration | All test files in this phase |
| `@electric-sql/pglite` | `^0.4.1` (installed) | In-memory Postgres for geocoding cache tests | Same pattern as existing pipeline.test.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Standalone `GeocodingCache` Prisma table | Adding columns to `Article` | Separate table allows reuse across Phase 42 backfill and Phase 43 on-demand; no schema migration on Article needed |
| Regex + LLM two-stage | LLM-only extraction | Regex is ~0ms and costs nothing; LLM fallback only fires when regex fails, keeping Haiku cost near zero |
| Public Nominatim (`nominatim.openstreetmap.org`) | Self-hosted Nominatim | At 1 article/day, public Nominatim is sufficient per PROJECT context decision; self-hosting ruled out in REQUIREMENTS.md |

**No new npm installs needed.** All dependencies are already in `package.json`.

---

## Architecture Patterns

### Recommended File Structure
```
src/lib/images/
├── mapgen.ts            # Phase 40 — unchanged
├── locextract.ts        # NEW — extractLocation() + llmLocationFallback()
└── geocode.ts           # NEW — geocodeLocation() with Postgres cache

prisma/
├── schema.prisma        # Add GeocodingCache model
└── migrations/
    └── 20260413_geocoding_cache/migration.sql  # NEW

src/lib/ai/
└── pipeline.ts          # MODIFIED — add map generation call after step2
```

### Pattern 1: Regex Location Extraction
**What:** Scan article text for Bezirk names and city synonyms from the seed data. Return the first match.
**When to use:** First stage of `extractLocation()` — always tried before LLM.
**Source:** `steiermarkBezirke` in `prisma/seed-data/bezirke.ts`.

The canonical names + `gemeindeSynonyms` from bezirke seed data provide 80+ place name variants covering all 13 Bezirke. Additional major Steiermark cities not in the Bezirk headquarters list (e.g., Kapfenberg, Zeltweg) are already in `gemeindeSynonyms` arrays.

```typescript
// Source: prisma/seed-data/bezirke.ts — steiermarkBezirke
// Build one flat list of all recognizable place names for regex matching
const ALL_PLACE_NAMES: string[] = steiermarkBezirke.flatMap((b) => [b.name, ...b.gemeindeSynonyms])

export function extractLocation(text: string): string | null {
  // Sort by length descending so longer/more specific names match first
  const sorted = [...ALL_PLACE_NAMES].sort((a, b) => b.length - a.length)
  for (const name of sorted) {
    // Word-boundary aware: match "Graz" but not "Graz-Umgebung" as just "Graz"
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i')
    if (regex.test(text)) return name
  }
  return null
}
```

**Critical:** The regex must be case-insensitive and word-boundary-aware. Sort by length descending to avoid "Graz" matching before "Graz-Umgebung".

### Pattern 2: LLM Location Fallback
**What:** When regex finds nothing, call Haiku with a short prompt asking for the most specific Austrian place name in the article.
**When to use:** Only when `extractLocation()` returns null. Guard against trivial/too-short articles.
**Source:** `src/lib/ai/steps/step1-tag.ts` — same SDK, same `output_config` JSON schema pattern.

```typescript
// Source: pattern from src/lib/ai/steps/step1-tag.ts
export async function llmLocationFallback(
  client: Anthropic,
  articleText: string
): Promise<string | null> {
  // Guard: skip if text too short to contain meaningful geographic content
  if (articleText.length < 100) return null

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    system: `Extract the single most specific Austrian place name from the article text.
Return a JSON object with a "location" field containing the place name string,
or null if no Austrian place is mentioned.`,
    messages: [{ role: 'user', content: articleText }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { location: { type: ['string', 'null'] } },
          required: ['location'],
          additionalProperties: false,
        },
      },
    },
  } as any) // output_config is project-local non-standard extension — same cast as step1-tag.ts

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return null

  try {
    const parsed = JSON.parse(textBlock.text) as { location: string | null }
    return parsed.location ?? null
  } catch {
    return null
  }
}
```

### Pattern 3: Nominatim Geocoding with Postgres Cache
**What:** Check `GeocodingCache` table first. On miss, call Nominatim, store result, return.
**API endpoint:** `https://nominatim.openstreetmap.org/search?q={name}&countrycodes=at&format=jsonv2&limit=1`
**Required header:** `User-Agent: Wurzelwelt/1.0 (https://wurzelwelt.at)` — Nominatim policy requires app identification.

```typescript
// Source: https://nominatim.org/release-docs/latest/api/Search/
export interface GeocodingResult {
  lat: number
  lon: number
  locationType: string  // OSM type: 'city', 'town', 'village', 'suburb', etc.
  displayName: string
}

export async function geocodeLocation(
  db: PrismaClient,
  placeName: string
): Promise<GeocodingResult | null> {
  const normalized = placeName.trim().toLowerCase()

  // 1. Cache lookup
  const cached = await db.geocodingCache.findUnique({ where: { normalizedName: normalized } })
  if (cached) {
    return { lat: cached.lat, lon: cached.lon, locationType: cached.locationType, displayName: cached.displayName }
  }

  // 2. Nominatim HTTP call — 1 req/s policy satisfied by cache; no rate-limit sleep needed in cron
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&countrycodes=at&format=jsonv2&limit=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Wurzelwelt/1.0 (https://wurzelwelt.at)' },
  })

  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)

  const results = await res.json() as NominatimResult[]
  if (!results.length) return null

  const { lat, lon, type, display_name } = results[0]

  // 3. Store in cache
  await db.geocodingCache.create({
    data: {
      normalizedName: normalized,
      displayName: display_name,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      locationType: type,
    },
  })

  return { lat: parseFloat(lat), lon: parseFloat(lon), locationType: type, displayName: display_name }
}
```

### Pattern 4: GeocodingCache Prisma Schema
**What:** A standalone table storing geocoding results keyed by normalized place name.

```prisma
// Add to prisma/schema.prisma
model GeocodingCache {
  id             Int      @id @default(autoincrement())
  normalizedName String   @unique  // lowercased, trimmed place name — dedup key
  displayName    String            // Nominatim display_name (human-readable)
  lat            Float
  lon            Float
  locationType   String            // OSM type: 'city', 'town', 'village', etc.
  cachedAt       DateTime @default(now())

  @@index([normalizedName])
}
```

This guarantees each unique place name is geocoded at most once, per MAP-02 success criterion.

### Pattern 5: Pipeline Integration Point
**What:** Call location extraction + geocoding + map generation inside `pipeline.ts` after step 2 completes, before writing the `WRITTEN` status. Wrapped in an inner try/catch so any failure leaves `imageUrl` null without affecting article status.
**Integration point in `pipeline.ts`:** Between step 2 output and the `db.article.update` call on line 174.

```typescript
// Source: src/lib/ai/pipeline.ts — after step2 completes (line ~170)
// Guard: only generate if no image already set
if (!article.imageUrl) {
  try {
    const rawText = [step2.headline, step2.lead, step2.body].join('\n\n')

    // MAP-01: regex extraction first
    let locationName = extractLocation(rawText)

    // CMS-02: LLM fallback if regex found nothing
    if (!locationName) {
      locationName = await llmLocationFallback(anthropicClient, rawText)
    }

    if (locationName) {
      // MAP-02: geocode with Postgres cache
      const geo = await geocodeLocation(db, locationName)
      if (geo) {
        // INTG-01: generate and store map image
        const mapImage = await generateMapImage(geo.lat, geo.lon, step2.headline, article.id, geo.locationType)
        if (mapImage) {
          await db.article.update({
            where: { id: article.id },
            data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
          })
        }
      }
    }
    // MAP-08: if locationName is null → imageUrl stays null — no error, no status change
  } catch (mapErr) {
    // INTG-02: map failure never blocks publication
    console.warn(`[pipeline] map generation skipped for article id=${article.id} — ${mapErr instanceof Error ? mapErr.message : String(mapErr)}`)
  }
}
```

### Pattern 6: Nominatim `type` Field Values for Austrian Places
**What:** Nominatim returns an OSM `type` value from the `place` class. The relevant values for Austrian settlements are:

| OSM type | Meaning | mapgen.ts zoom |
|----------|---------|---------------|
| `city` | City (Graz, Salzburg scale) | 12 |
| `town` | Town (Leoben, Klagenfurt scale) | 13 |
| `village` | Village | 14 |
| `suburb` | Suburb/district | 13 (default — unknown type) |
| `municipality` | Austrian Gemeinde | 13 (default) |

Types not in `ZOOM_BY_LOCATION_TYPE` fall through to `DEFAULT_ZOOM = 13` in `selectZoom()` — existing behavior, no changes needed.

### Anti-Patterns to Avoid
- **Sleeping between Nominatim calls in cron:** The cache eliminates duplicate requests. The cron runs once per cycle (~1 new article/day in production). No sleep needed.
- **Calling `extractLocation` on raw HTML/JSON payload:** Use the AI-rewritten text (`step2.headline + step2.lead + step2.body`), not `article.rawPayload`. The rewritten German text is cleaner for regex matching.
- **Passing Bezirk `name` directly to Nominatim:** Bezirk names like "Graz (Stadt)" or "Bruck-Mürzzuschlag" may confuse Nominatim. Use the matched synonym (e.g., "Graz", "Bruck an der Mur") as the geocoding query, not the full Bezirk display name.
- **Not normalizing the cache key:** Always lowercase + trim before `GeocodingCache` lookup. "Graz" and "graz" must resolve to the same cache row.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM JSON extraction | Custom prompt parsing | `output_config` JSON schema (same as step1-tag.ts) | Schema enforcement eliminates JSON parse errors; pattern already validated in prod |
| Geocoding HTTP client | Custom retry/timeout | Single `fetch` call + outer try/catch | At 1 req/s max, retry complexity is unnecessary; outer catch handles failures gracefully |
| Place name normalization | Custom stemmer | `String.toLowerCase().trim()` | Austrian place names are stable; case+whitespace normalization is sufficient for cache dedup |
| Regex escape utility | Custom escaper | Standard `str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` | Tiny inline helper — no library needed for a fixed list of ~80 place names |

---

## Common Pitfalls

### Pitfall 1: Regex Matching "Graz" Before "Graz-Umgebung"
**What goes wrong:** Short name "Graz" matches in article about Graz-Umgebung, wrong Bezirk center geocoded.
**Why it happens:** Naive iteration over place names without length sorting.
**How to avoid:** Sort ALL_PLACE_NAMES by string length descending before building the regex list. "Graz-Umgebung" (13 chars) is tested before "Graz" (4 chars).
**Warning signs:** Map images show Graz city center for articles about suburban Bezirke.

### Pitfall 2: Bezirk Display Name Breaks Nominatim Search
**What goes wrong:** `geocodeLocation("Graz (Stadt)")` returns no results or wrong result.
**Why it happens:** Nominatim search is confused by parentheses; "Graz (Stadt)" is a CMS label, not a Nominatim-searchable name.
**How to avoid:** When a regex match is the Bezirk `name` (not a synonym), replace with the first `gemeindeSynonym`. Better: build a separate lookup table mapping matched place text → canonical geocoding query. For example, "Graz (Stadt)" → "Graz", "Bruck-Mürzzuschlag" → "Bruck an der Mur".
**Warning signs:** Cache rows with `locationType` null or `displayName` pointing to wrong country.

### Pitfall 3: LLM Returns Non-Austrian Place Name
**What goes wrong:** Haiku returns "Berlin" or "Wien" for an article about state politics mentioning the federal government.
**Why it happens:** LLM interprets "meaningful geographic content" broadly.
**How to avoid:** After LLM fallback, the Nominatim call uses `countrycodes=at` — a non-Austrian place returns no results and the article falls through gracefully to `imageUrl=null`. No special validation needed in the LLM response itself.
**Warning signs:** Nominatim returning 0 results despite LLM returning a value. This is expected and correct behavior.

### Pitfall 4: Race Condition — `imageUrl` Already Set by Unsplash
**What goes wrong:** Map image overwrites a manually-set Unsplash image.
**Why it happens:** Pipeline integration doesn't guard for existing `imageUrl`.
**How to avoid:** The guard `if (!article.imageUrl)` at the pipeline integration point (Pattern 5 above) must check the `article` object loaded at the top of the loop, not a re-fetch. The `article` was loaded from DB before the loop started.
**Warning signs:** Articles that had Unsplash images now show map images.

### Pitfall 5: Steiermark City Regex Missing Common Article Mentions
**What goes wrong:** Articles about Kapfenberg, Zeltweg, or Judenburg don't get map images because those cities aren't in the regex list.
**Why it happens:** Only Bezirk headquarters are well-known; significant secondary towns may be missed.
**How to avoid:** The `gemeindeSynonyms` in seed data already cover the most important secondary cities per Bezirk (Kapfenberg is in `bruck-muerzzuschlag`, Zeltweg in `murtal`, Judenburg in `murtal`). STATE.md flags this: "Steiermark city regex list needs validation against real ORF RSS article titles before finalizing." A Wave 0 task should verify coverage.
**Warning signs:** Articles about Kapfenberg, Zeltweg, Knittelfeld consistently publish with `imageUrl=null`.

### Pitfall 6: Nominatim Returns `lat`/`lon` as Strings
**What goes wrong:** `parseFloat` not called, Prisma `Float` field receives a string, TypeScript error or silent NaN.
**Why it happens:** Nominatim JSON format returns `lat` and `lon` as string values (`"47.0708678"`) in all non-GeoJSON formats.
**How to avoid:** Always `parseFloat(result.lat)` and `parseFloat(result.lon)` before storing or passing to `generateMapImage`.
**Warning signs:** TypeScript compiler warning `Type 'string' is not assignable to type 'number'` or NaN coordinates.

### Pitfall 7: `output_config` Cast Required
**What goes wrong:** TypeScript compilation error on `client.messages.create({ output_config: ... })`.
**Why it happens:** `output_config` is a project-local non-standard extension not typed in `@anthropic-ai/sdk`. The existing step1-tag.ts uses `as any` cast.
**How to avoid:** Match the exact `as any` cast pattern from `src/lib/ai/steps/step1-tag.ts`. Do not attempt to type this differently.

---

## Code Examples

### Nominatim Search Request (verified format)
```typescript
// Source: https://nominatim.org/release-docs/latest/api/Search/
const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent('Graz')}&countrycodes=at&format=jsonv2&limit=1`
const res = await fetch(url, {
  headers: { 'User-Agent': 'Wurzelwelt/1.0 (https://wurzelwelt.at)' }
})
// Response: array of objects, first element:
// { place_id: ..., lat: "47.07", lon: "15.43", type: "city", display_name: "Graz, ..." }
```

### GeocodingCache Prisma Upsert (correct for cache-aside pattern)
```typescript
// Use create for new entries (unique constraint on normalizedName handles concurrent inserts)
await db.geocodingCache.create({
  data: { normalizedName: normalized, displayName, lat, lon, locationType },
})
// On P2002 (unique violation from concurrent writes): ignore — another request cached it first
```

### Regex Place Name Extraction (production-safe)
```typescript
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractLocation(text: string): string | null {
  const candidates = steiermarkBezirke
    .flatMap((b) => [b.name, ...b.gemeindeSynonyms])
    .sort((a, b) => b.length - a.length)  // longest first

  for (const name of candidates) {
    if (new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(text)) {
      return name
    }
  }
  return null
}
```

### Pipeline Integration (minimal diff to pipeline.ts)
```typescript
// Source: src/lib/ai/pipeline.ts — insert after step2 result, before article.update
import { extractLocation, llmLocationFallback } from '../images/locextract'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'

// Inside the per-article try/catch, after step2 completes:
if (!article.imageUrl) {
  try {
    const articleContent = [step2.headline, step2.lead, step2.body].join('\n\n')
    const locationName = extractLocation(articleContent)
      ?? await llmLocationFallback(anthropicClient, articleContent)

    if (locationName) {
      const geo = await geocodeLocation(db, locationName)
      if (geo) {
        const mapImage = await generateMapImage(geo.lat, geo.lon, step2.headline, article.id, geo.locationType)
        if (mapImage) {
          await db.article.update({
            where: { id: article.id },
            data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
          })
        }
      }
    }
  } catch (mapErr) {
    console.warn(`[pipeline] map skipped id=${article.id} — ${mapErr instanceof Error ? mapErr.message : String(mapErr)}`)
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Step 1 system prompt with `tool_choice` | `output_config.format.json_schema` | Phase 33 per step1-tag.ts code | `output_config` is the project standard; tool_choice pattern is deprecated in this codebase |
| Separate Nominatim npm client | Direct `fetch` with cache | Project standard | fetch is already used in mapgen.ts; no additional client wrapper needed |

**Deprecated in this project:**
- `tool_choice` / `tools` for structured output: Step1-tag.ts confirmed `output_config` is the project standard.

---

## Open Questions

1. **Regex coverage validation against real ORF RSS titles**
   - What we know: `gemeindeSynonyms` cover major secondary cities per Bezirk. STATE.md explicitly flags: "Steiermark city regex list needs validation against real ORF RSS article titles before finalizing."
   - What's unclear: Whether less prominent places (small villages) appear in actual articles at measurable frequency.
   - Recommendation: Planner creates a Wave 0 task to review last 20 real ORF RSS article titles and verify at least 80% have a matching place name in the regex list. Extend synonyms list if gaps found.

2. **Geocoding query for Bezirk names with parentheses/special chars**
   - What we know: Bezirk `name` values like "Graz (Stadt)" and "Bruck-Mürzzuschlag" are CMS display labels, not standard geocoding queries.
   - What's unclear: Whether to build a separate `geocodingQuery` property per Bezirk or strip parentheses at call time.
   - Recommendation: Build a small `GEOCODING_QUERY_OVERRIDE` map in `locextract.ts`: `{ 'Graz (Stadt)': 'Graz', 'Bruck-Mürzzuschlag': 'Bruck an der Mur', ... }`. Applied in `geocodeLocation` before URL construction. Avoids modifying the bezirke seed data.

3. **LLM fallback token cost per cron run**
   - What we know: Haiku is ~$0.25/M input tokens. A 500-word article = ~700 tokens. At 1 article/day, cost is < $0.01/month.
   - What's unclear: Whether the LLM fallback should be gated behind a feature flag in `PipelineConfig` for cost control.
   - Recommendation: No feature flag for this phase — cost is negligible. Phase 42 can add a toggle if needed.

4. **Concurrent write race on GeocodingCache**
   - What we know: On serverless burst (multiple cron invocations overlap), two requests for "Graz" could both miss cache and attempt to insert simultaneously, causing a unique constraint violation (P2002).
   - Recommendation: Wrap the `create` in a `try/catch` that ignores Prisma P2002 errors and falls back to a `findUnique`. Alternatively use `upsert` with `create`/`update` both setting the same data. Upsert is cleaner.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/images/locextract.test.ts src/lib/images/geocode.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | `extractLocation` finds Bezirk names and synonyms via regex | unit | `npx vitest run src/lib/images/locextract.test.ts` | ❌ Wave 0 |
| MAP-01 | `extractLocation` returns null when no Steiermark place found | unit | `npx vitest run src/lib/images/locextract.test.ts` | ❌ Wave 0 |
| MAP-01 | Longer names match before shorter (Graz-Umgebung before Graz) | unit | `npx vitest run src/lib/images/locextract.test.ts` | ❌ Wave 0 |
| MAP-02 | `geocodeLocation` returns cached result without HTTP call on second invocation | unit | `npx vitest run src/lib/images/geocode.test.ts` | ❌ Wave 0 |
| MAP-02 | `geocodeLocation` stores result in GeocodingCache on cache miss | unit | `npx vitest run src/lib/images/geocode.test.ts` | ❌ Wave 0 |
| MAP-02 | `geocodeLocation` returns null when Nominatim returns empty results | unit | `npx vitest run src/lib/images/geocode.test.ts` | ❌ Wave 0 |
| CMS-02 | `llmLocationFallback` returns null on short text (< 100 chars) | unit | `npx vitest run src/lib/images/locextract.test.ts` | ❌ Wave 0 |
| CMS-02 | `llmLocationFallback` returns null when LLM response has location: null | unit | `npx vitest run src/lib/images/locextract.test.ts` | ❌ Wave 0 |
| INTG-01 | Pipeline calls `generateMapImage` after step2 when imageUrl is null | unit | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ exists (needs new test case) |
| INTG-01 | Pipeline skips map generation when article.imageUrl is already set | unit | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ exists (needs new test case) |
| INTG-01 | Map generation failure does not change article status | unit | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ exists (needs new test case) |
| MAP-01+02 | End-to-end: article with "Graz" in text gets imageUrl populated | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ exists (needs new test case) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/images/locextract.test.ts src/lib/images/geocode.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/images/locextract.test.ts` — covers MAP-01, CMS-02
- [ ] `src/lib/images/geocode.test.ts` — covers MAP-02 (mock fetch + pglite in-memory DB)
- [ ] `prisma/migrations/20260413_geocoding_cache/migration.sql` — GeocodingCache table
- [ ] `prisma/schema.prisma` GeocodingCache model addition
- [ ] New test cases in `src/lib/ai/pipeline.test.ts` — INTG-01 integration path

*(Existing test infrastructure: vitest, pglite, vi.fn() mocking — no new setup needed)*

---

## Sources

### Primary (HIGH confidence)
- `https://nominatim.org/release-docs/latest/api/Search/` — query parameters (`q`, `countrycodes`, `format`, `limit`), response field names
- `https://nominatim.org/release-docs/latest/api/Output/` — `lat`/`lon` as strings, `type` field meaning, example response structure
- `https://operations.osmfoundation.org/policies/nominatim/` — 1 req/s rate limit, User-Agent requirement, bulk caching mandatory
- `src/lib/ai/steps/step1-tag.ts` — `output_config.format.json_schema` pattern, Haiku model name, `as any` cast
- `src/lib/ai/pipeline.ts` — per-article try/catch pattern, DI pattern, loop structure (integration point)
- `src/lib/images/mapgen.ts` — `generateMapImage` signature (accepts `locationType` as 5th arg), return type `MapImage | null`
- `prisma/seed-data/bezirke.ts` — complete list of Bezirk names and synonyms for regex list

### Secondary (MEDIUM confidence)
- OSM place tag wiki (type values `city`/`town`/`village`/`suburb`) — consistent with `ZOOM_BY_LOCATION_TYPE` in mapgen.ts; confirmed by Nominatim Output docs example showing `"type": "city"`

### Tertiary (LOW confidence)
- None — all critical claims verified from primary sources

---

## Metadata

**Confidence breakdown:**
- Nominatim API: HIGH — official docs verified for query format, response shape, rate limits
- LLM fallback pattern: HIGH — exact code pattern copied from existing step1-tag.ts in the project
- Pipeline integration: HIGH — integration point identified precisely in pipeline.ts source
- Regex extraction: HIGH — place name list from seed data directly; sort-by-length deduplication is standard practice
- GeocodingCache schema: HIGH — straightforward Prisma model addition; upsert concurrency pattern is standard
- Bezirk name → geocoding query mapping: MEDIUM — which names need overrides requires validation against real Nominatim queries (Wave 0 task recommended)

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (Nominatim API stable; project code patterns verified from source)
