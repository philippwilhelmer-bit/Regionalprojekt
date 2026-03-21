# Requirements: Regionalprojekt (Ennstal Aktuell)

**Defined:** 2026-03-21
**Core Value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.

## v1 Requirements

### Configuration

- [x] **CONF-01**: Platform is deployable for any Bundesland by changing a single config file (regions, branding, sources)
- [x] **CONF-02**: Steiermark deployment ships with all 13 regions pre-configured (12 Bezirke + Graz)

### Ingestion

- [x] **ING-01**: System ingests press releases from OTS.at via API
- [x] **ING-02**: System ingests content from generic RSS/Atom feeds
- [x] **ING-03**: System deduplicates content using content fingerprinting (not URL-only)
- [x] **ING-04**: System alerts operator when a source fails or goes stale
- [x] **ING-05**: Source adapters follow a plug-in interface so new sources can be added without changing core ingestion logic

### AI Pipeline

- [x] **AI-01**: System rewrites ingested content into clean German-language news articles via AI
- [x] **AI-02**: System automatically tags each article with the relevant Bezirk(e)
- [x] **AI-03**: System flags articles mentioning real named persons and routes them to an exception queue before auto-publishing
- [x] **AI-04**: System halts AI generation and alerts operator if LLM costs exceed a configurable threshold (cost circuit-breaker)
- [x] **AI-05**: All AI-generated articles display an "Automatisch erstellt" disclosure label

### Publishing

- [ ] **PUB-01**: Approved articles publish automatically without manual intervention
- [ ] **PUB-02**: System polls all sources on a scheduled cron interval
- [ ] **PUB-03**: System alerts operator if the automated pipeline stops running (dead-man monitor)

### Editorial CMS

- [ ] **CMS-01**: Editor can write and publish articles manually
- [ ] **CMS-02**: Editor can pin, feature, edit, or remove any article
- [ ] **CMS-03**: Editor can review, approve, or reject articles in the exception queue
- [ ] **CMS-04**: Editor can add, configure, and disable content sources from the admin interface

### AI Configuration

- [ ] **AICONF-01**: Editor can configure global AI generation settings (tone, style, article length, language register)
- [ ] **AICONF-02**: Editor can override AI settings per source (different prompt templates for OTS.at vs individual RSS feeds)
- [ ] **AICONF-03**: AI configuration is editable from the admin UI without code changes

### Advertising

- [ ] **AD-01**: Site integrates Google AdSense with configurable placement zones (e.g. hero, between articles, article detail)
- [x] **AD-02**: Ad placements are configurable per deployment via the Bundesland config file

### SEO

- [ ] **SEO-01**: Every article page has SEO-optimized meta tags (title, description, Open Graph)
- [x] **SEO-02**: AI generates SEO-optimized article titles and meta descriptions as part of the generation pipeline
- [ ] **SEO-03**: Site generates a sitemap.xml updated on each new article publish
- [ ] **SEO-04**: Article pages include structured data (JSON-LD NewsArticle schema) for Google News eligibility

### Reader Site

- [ ] **READ-01**: Reader can select one or more Bezirke ("Mein Bezirk"), preferences saved locally without an account
- [ ] **READ-02**: Homepage shows a news feed filtered to the reader's selected regions
- [ ] **READ-03**: Reader can open a full article detail page with source attribution
- [ ] **READ-04**: Site is mobile-optimized (existing alpine-themed HTML design is the visual reference)
- [ ] **READ-05**: Site includes a legally compliant Impressum page (Austrian Mediengesetz / ECG)
- [ ] **READ-06**: Each Bezirk has its own subscribable RSS feed for readers

## v2 Requirements

### Expansion

- **EXP-V2-01**: Additional Bundesland deployments beyond Steiermark (e.g. Oberösterreich, Niederösterreich)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS/Android app | Mobile-optimized web is sufficient for v1 |
| Reader accounts / registration | "Mein Bezirk" works via localStorage; auth adds GDPR surface area for no reader benefit |
| Paywalls | Not in v1 scope |
| Multi-tenant single app | Config-driven deployment per Bundesland is simpler and sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONF-01 | Phase 1 | Complete |
| CONF-02 | Phase 1 | Complete |
| ING-01 | Phase 2 | Complete |
| ING-02 | Phase 2 | Complete |
| ING-03 | Phase 2 | Complete |
| ING-04 | Phase 2 | Complete |
| ING-05 | Phase 2 | Complete |
| AI-01 | Phase 3 | Complete |
| AI-02 | Phase 3 | Complete |
| AI-03 | Phase 3 | Complete |
| AI-04 | Phase 3 | Complete |
| AI-05 | Phase 3 | Complete |
| PUB-01 | Phase 4 | Pending |
| PUB-02 | Phase 4 | Pending |
| PUB-03 | Phase 4 | Pending |
| CMS-01 | Phase 5 | Pending |
| CMS-02 | Phase 5 | Pending |
| CMS-03 | Phase 5 | Pending |
| CMS-04 | Phase 5 | Pending |
| READ-01 | Phase 6 | Pending |
| READ-02 | Phase 6 | Pending |
| READ-03 | Phase 6 | Pending |
| READ-04 | Phase 6 | Pending |
| READ-05 | Phase 6 | Pending |
| READ-06 | Phase 6 | Pending |
| AICONF-01 | Phase 5 | Pending |
| AICONF-02 | Phase 5 | Pending |
| AICONF-03 | Phase 5 | Pending |
| AD-01 | Phase 6 | Pending |
| AD-02 | Phase 1 | Complete |
| SEO-01 | Phase 6 | Pending |
| SEO-02 | Phase 3 | Complete |
| SEO-03 | Phase 6 | Pending |
| SEO-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

**Note on Phase 7:** Phase 7 (Extensibility and Quality Validation) is a validation phase — it does not introduce new requirements. It verifies that ING-02 (RSS extensibility), ING-03 (cross-source deduplication), and all monitoring requirements are correct end-to-end under real conditions.

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 — traceability finalized after roadmap creation*
