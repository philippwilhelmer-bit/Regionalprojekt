# Requirements: Wurzelwelt v3.1 Basemap Article Images

**Defined:** 2026-04-05
**Core Value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.

## v3.1 Requirements

Requirements for basemap.at map image generation. Each maps to roadmap phases.

### Map Image Pipeline

- [x] **MAP-01**: System extracts location (city/town/street) from article text using regex patterns for Austrian place names and Bezirk names from config
- [x] **MAP-02**: System geocodes extracted location via Nominatim with `countrycodes=at`, caches results in Postgres to avoid rate limit bans
- [x] **MAP-03**: System fetches basemap.at tiles at computed XYZ coordinates and stitches them into a single image using sharp
- [x] **MAP-04**: System auto-selects zoom level (10–15) based on Nominatim result type (city→12, town→13, village→14, street→15)
- [x] **MAP-05**: System selects map layer based on article topic keywords (greyscale default, terrain for nature, aerial for infrastructure)
- [x] **MAP-06**: System stores generated map image in Vercel Blob and writes URL to Article.imageUrl
- [x] **MAP-07**: System sets Article.imageCredit to "© basemap.at" for all generated map images (CC-BY 4.0 compliance)
- [x] **MAP-08**: System falls back gracefully to gradient (imageUrl remains null) when location extraction, geocoding, or tile fetching fails

### Pipeline Integration

- [ ] **INTG-01**: System automatically generates map image after AI article generation during cron ingestion pipeline
- [x] **INTG-02**: Map generation failure never blocks article creation or publication
- [ ] **INTG-03**: System provides on-demand API route to generate map image for any article by ID
- [ ] **INTG-04**: Editor can trigger bulk backfill to generate maps for existing articles without images

### CMS Editor Tools

- [ ] **CMS-01**: Editor can preview, regenerate, and override map images via a "Karte" tab alongside existing Unsplash picker
- [x] **CMS-02**: System uses LLM fallback to extract location when regex finds nothing and article has meaningful geographic content

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Map Enhancements

- **MAPE-01**: Generation metadata stored as JSONB on Article (location, zoom, layer, generatedAt)
- **MAPE-02**: Interactive maps on article pages via Leaflet/MapLibre

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mapbox / Google Maps Static API | Requires API keys and usage costs; basemap.at is free CC-BY 4.0 |
| Custom map tile styling (brand colors) | basemap.at serves pre-rendered raster tiles; custom styling requires vector tiles + MapLibre |
| Real-time tile rendering on page load | 1–3s latency unacceptable for article loads; generate once, store in Blob |
| Self-hosted Nominatim | At 1 article/day cron, public Nominatim is sufficient |
| Zoom preference in reader app | No reader UI for this; auto-selection + CMS override is sufficient |
| Tile-level caching (Redis/KV) | Vercel Blob stores composited image; tiles are ephemeral during generation |
| Dark mode maps | Not part of Archivist identity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 41 | Complete |
| MAP-02 | Phase 41 | Complete |
| MAP-03 | Phase 40 | Complete |
| MAP-04 | Phase 40 | Complete |
| MAP-05 | Phase 40 | Complete |
| MAP-06 | Phase 40 | Complete |
| MAP-07 | Phase 40 | Complete |
| MAP-08 | Phase 40 | Complete |
| INTG-01 | Phase 41 | Pending |
| INTG-02 | Phase 40 | Complete |
| INTG-03 | Phase 42 | Pending |
| INTG-04 | Phase 42 | Pending |
| CMS-01 | Phase 42 | Pending |
| CMS-02 | Phase 41 | Complete |

**Coverage:**
- v3.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
