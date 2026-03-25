# Pitfalls Research

**Domain:** AI-powered regional news aggregation and publishing platform
**Researched:** 2026-03-21
**Confidence:** MEDIUM (training knowledge; WebSearch unavailable — critical items flagged for validation)

---

## Critical Pitfalls

### Pitfall 1: Auto-publishing Hallucinated or Factually Wrong Content

**What goes wrong:**
The AI generates an article that attributes a statement to a real named person or real local authority that they never made, or inverts facts from the source (e.g., "construction begins" becomes "construction cancelled"). With no human review gate before publish, this goes live immediately and can cause legal exposure or credibility damage in a small regional community where the named person is likely to see it.

**Why it happens:**
LLMs summarize and rephrase; they do not verify. When source material is ambiguous, poorly structured, or contains negation-heavy German grammar, the model can flip the meaning. The "auto-publish by default" requirement removes the only natural safety valve.

**How to avoid:**
- Treat AI-generated content as a draft unless the source article passes a confidence gate (structured data from wire service > unstructured RSS blog post)
- Implement a hallucination-reduction prompt pattern: instruct the model to quote the original source for every factual claim, and to refuse to infer facts not present in the source
- For any article mentioning a named real person (Persönlichkeit), flag it for a brief editorial spot-check queue even in autonomous mode — this is the highest-risk content category
- Log the full source text alongside every generated article so any inaccuracy can be traced and corrected within minutes

**Warning signs:**
- Generated articles consistently longer than source material (padding = invention)
- Articles contain specific figures (dates, amounts, vote counts) not present in the source
- High variance in tone between source language and generated German

**Phase to address:**
AI content generation pipeline (core automation phase)

---

### Pitfall 2: Duplicate Article Flooding

**What goes wrong:**
The same OTS press release gets ingested multiple times — once from the OTS API, once from an RSS feed that syndicates OTS, and again when the RSS poll runs a second time before deduplication logic runs. The platform publishes three nearly-identical articles about the same Bezirk event within an hour. This destroys reader trust in the "curated local news" promise.

**Why it happens:**
Deduplication is treated as a nice-to-have and implemented after ingestion rather than as a gate. RSS feeds for regional news frequently syndicate the same wire content. URL-based deduplication fails because syndicated versions have different URLs.

**How to avoid:**
- Implement content fingerprinting (e.g., MinHash or simhash on normalized source text) at ingestion time, before any AI processing happens
- Use a canonical source registry: if an article's OTS ID or a known wire ID is already recorded, reject it at the ingest gate regardless of URL
- Per-source deduplication windows: for any single feed, enforce a minimum time gap between articles about the same entity (Bezirk + topic hash)
- Track the relationship between sources — mark OTS.at as canonical; any RSS feed that syndicates OTS should be checked against the OTS ID registry first

**Warning signs:**
- Multiple articles with >80% textual overlap published in the same hour
- Feed poll logs showing the same item ID appearing across multiple fetch cycles
- RSS feed URLs resolving to the same OTS article IDs

**Phase to address:**
Source ingestion and RSS pipeline phase (before AI generation is enabled)

---

### Pitfall 3: Bezirk Attribution Getting It Wrong

**What goes wrong:**
An OTS press release about a Landesregierung Steiermark decision affecting Bezirk Liezen gets tagged to all 13 Bezirke, or worse, to none. The "Mein Bezirk" feature becomes useless if articles aren't attributed to the right geographic unit, and this is a silent failure — no error is thrown, articles just appear in the wrong (or all) feeds.

**Why it happens:**
Geographic entity extraction is harder than it looks for Austrian regional content. OTS press releases frequently name multiple Bezirke, reference Gemeinden that belong to Bezirke, or use informal regional names (e.g., "Ennstal" instead of "Bezirk Liezen"). Naive keyword matching and LLM geo-extraction both fail in different ways: keyword matching misses synonyms and over-matches partial strings; LLMs hallucinate administrative boundaries.

**How to avoid:**
- Build a canonical Bezirk-Gemeinde lookup table at project start (all 13 Bezirke, all Gemeinden, known synonyms like "Ennstal" → Liezen) as a static reference fixture — this is foundational data
- Geo-tagging should be a deterministic rule-based pass first (lookup table match), with LLM extraction only as a fallback for ambiguous cases
- When multiple Bezirke match, tag all of them — false positives in personalization are less damaging than false negatives
- Add a confidence score to the geo-tag; articles below a threshold get a "Steiermark" catch-all tag and are surfaced in a general feed, not buried

**Warning signs:**
- High percentage of articles tagged to "Steiermark" catch-all (indicates geo-extraction is failing)
- User feedback that their Bezirk feed shows irrelevant statewide content
- Articles about clearly local events appearing in multiple Bezirk feeds simultaneously without being genuinely cross-Bezirk

**Phase to address:**
Source ingestion phase AND "Mein Bezirk" personalization phase — the lookup table must be built before ingestion is active

---

### Pitfall 4: Rate Limit and API Quota Exhaustion Causing Silent Gaps

**What goes wrong:**
The OTS.at API (or any paid news wire) has rate limits or daily call quotas. The ingestion pipeline hits the limit, the API returns a 429 or quota-exceeded error, and the system silently stops ingesting. No new articles are published for hours. Editors don't know; readers don't know. The autonomous platform appears to be running but is actually dead.

**Why it happens:**
Rate limiting is handled as an exception (try/catch, log and continue) rather than as a monitored system state. Developers test with low volume and never trigger the limit during development.

**How to avoid:**
- Treat API quota as a first-class monitored resource: track calls per hour/day, alert when 80% consumed
- Implement circuit-breaker behavior: after N consecutive 429s, pause the feed, increment a dead-feed counter, and surface a visible warning in the admin/editor CMS dashboard
- Design the polling schedule to stay well under quota — calculate the maximum sustainable poll frequency at the OTS API tier being used and hard-code it
- Never swallow HTTP errors silently in ingestion workers; every error must update an observable feed health status

**Warning signs:**
- Article publication rate drops to zero without any errors in the application log
- Ingestion worker logs show escalating 429 responses
- Time gaps in the article publication timeline that don't correspond to natural quiet periods

**Phase to address:**
Source ingestion and OTS.at integration phase; monitoring must be built alongside the ingestion pipeline, not added later

---

### Pitfall 5: AI Generation Costs Exploding at Scale

**What goes wrong:**
The platform is designed around LLM calls per article. With multiple RSS feeds running and OTS.at delivering bursts of 20-30 press releases per hour around major regional events (elections, floods, infrastructure announcements), the LLM API cost per day can spike by 10-20x unexpectedly. For a lean regional news platform with no revenue model in v1, this is a project-stopper.

**Why it happens:**
Cost is measured per-article in development (tiny volume) and never modeled at production ingestion rates. Burst event scenarios (a major Bezirk event triggers 40 press releases in 2 hours) are not load-tested.

**How to avoid:**
- Implement a cost gate: before calling the LLM, check if the article is substantive enough to justify generation (minimum source word count, not already covered in last 6 hours for same topic)
- Set hard daily/hourly LLM call budgets with automatic circuit-breaker that falls back to publishing the original source excerpt (no AI generation) when the budget is exhausted
- Use a tiered approach: short summaries for most articles (cheap), long-form generation only for manually flagged or high-engagement topics
- Model costs at 3 burst scenarios before launch: average day, major local event, crisis event

**Warning signs:**
- LLM API billing spikes during regional events
- No maximum daily call cap exists in the code
- All articles regardless of source length are sent through full-generation pipeline

**Phase to address:**
AI content generation phase — cost controls are a required feature of the pipeline, not an optimization

---

### Pitfall 6: The CMS Becomes Unmanageable When AI Content Volumes Are High

**What goes wrong:**
The editorial CMS is designed around the assumption that editors occasionally review content. At full automation with multiple feeds active, the CMS article list fills with hundreds of AI-generated articles per day. Editors trying to pin, feature, or remove specific content can't find it in the stream. The "editorial override" feature becomes practically unusable.

**Why it happens:**
CMS interfaces are designed for manual publishing workflows. When 95% of content is AI-generated, the editor's workflow is fundamentally different: they need to filter by source, by Bezirk, by publication status, and quickly find the few articles they want to touch — not scroll through a chronological feed.

**How to avoid:**
- Design the CMS with the high-volume AI scenario as the primary use case, not an edge case
- Required CMS filters from day one: by Bezirk, by source (OTS vs RSS), by generation status (AI/manual), by publication time range, by presence in a pinned/featured slot
- "Exceptions queue": a separate inbox for articles that triggered warning flags during generation (low confidence geo-tag, named-person mention, below-threshold source quality) — editors only need to look at exceptions, not the full stream
- Bulk actions: mark-as-reviewed, unpublish by source, archive by date range

**Warning signs:**
- CMS page 1 of the article list is more than 2 days old
- Editors report they "can't find" specific articles
- No filtering exists beyond chronological sort

**Phase to address:**
Editorial CMS phase — filters and exceptions queue are not optional

---

### Pitfall 7: Schema/Data Model Lock-in That Blocks Adding New Sources

**What goes wrong:**
The initial data model is built tightly around OTS.at's API response shape (specific field names, OTS-specific metadata). When adding the second RSS feed source, the ingest logic requires significant refactoring because the model doesn't have a clean source-agnostic abstraction. This gets worse with each new source and eventually the "extensible source system" requirement is technically violated.

**Why it happens:**
It's faster to ship with a concrete model. Developers hardcode `ots_id`, `ots_category`, `ots_distributor` etc. directly in the article schema rather than building a normalized source record plus a generic raw-payload store.

**How to avoid:**
- Design the canonical article schema to contain only source-agnostic fields: `source_id`, `source_name`, `external_id`, `raw_payload` (JSON blob), `ingest_timestamp`, `canonical_url`
- Each source type gets a Source Adapter that maps its native format to the canonical schema — OTS adapter, RSS adapter, etc.
- The adapter pattern must be enforced as the only path to article creation; no code outside adapters should know what OTS fields look like
- Test source extensibility by implementing two sources before calling the architecture "done"

**Warning signs:**
- Article database schema contains fields like `ots_*` or `rss_*` (source-specific prefixes in the canonical model)
- Adding a new RSS feed requires modifying the Article model
- Ingestion code contains `if source == 'ots' ... else if source == 'rss'` branching logic in the core pipeline

**Phase to address:**
Source ingestion architecture phase — this is a foundational decision that is expensive to reverse

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode OTS field names in article model | Faster first integration | Every new source requires model migration | Never — use adapter pattern from day one |
| Skip deduplication until "it becomes a problem" | Save 1-2 days | Duplicate flood damages user trust irreversibly at launch | Never — build before enabling auto-publish |
| Single LLM prompt for all article types | Simple to implement | Short press releases and long investigative pieces need different prompting; quality suffers | Acceptable for MVP, refactor by Phase 3 |
| Store Bezirk as free-text string | Quick to implement | Querying, filtering, and consistency break immediately | Never — use canonical Bezirk enum/table |
| Polling RSS feeds on a fixed short interval (e.g., every 5 min) | Fresh content | API abuse flags, rate limiting, unnecessary load | Use feed-declared `<ttl>` or minimum 15-min intervals |
| No AI generation cost cap | One less feature to build | Single burst event can exhaust monthly API budget | Never — always cap |
| CMS is just a chronological article list | Fast to build | Unusable at any real automation volume | Acceptable for manual-only phase; must be refactored before automation goes live |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OTS.at API | Assuming OTS content is always structured and clean | OTS press releases are authored by PR agencies — expect inconsistent formatting, embedded HTML, mixed German/English, and varying quality. Normalize aggressively |
| OTS.at API | Not handling authentication token expiry | OTS API tokens expire; implement proactive token refresh and test expiry handling explicitly |
| OTS.at API | Fetching full article bodies on every poll | Use `If-Modified-Since` or ETag headers where available; cache OTS IDs to skip already-ingested items |
| RSS feeds | Treating RSS `<pubDate>` as reliable | Many regional Austrian news sites publish with wrong or missing dates; fall back to ingest timestamp, never trust `pubDate` for deduplication |
| RSS feeds | Assuming valid XML | RSS feeds in the wild frequently have encoding errors, invalid entities, or unclosed tags. Use a lenient XML parser with fallback to html-parser |
| LLM API (OpenAI/Anthropic) | Not setting `max_tokens` | Without a cap, a malformed prompt or unusually long source article can produce a runaway generation that costs 10x normal |
| LLM API | Synchronous blocking generation in the ingestion worker | If the LLM call takes 8-15 seconds, synchronous processing blocks the entire ingestion queue. Use async/queue architecture |
| Any external API | No dead-man monitoring | If no article has been published in X hours during normal operating hours, alert — don't wait for users to notice |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all articles for a Bezirk feed from DB on every page load | Fast at 100 articles, slow at 10,000 | Paginate and index by (bezirk_id, published_at DESC) from the start | At ~5,000 articles per Bezirk |
| Running deduplication as a post-publish DB scan | Acceptable at 10 sources, catastrophic at 50 | Dedup at ingest time using a hash index, not a full-table scan | At ~20,000 articles total |
| Generating AI content synchronously in the HTTP request cycle | Fine for manual publish, broken for bulk ingest | Always use a background job queue for LLM calls | At first burst event (10+ simultaneous ingests) |
| Storing `raw_payload` as text and querying it with LIKE | Works for debugging, useless for search | Use JSONB (Postgres) or keep raw payload separate from queryable fields | At ~1,000 articles |
| No CDN for article images (referenced from OTS) | Irrelevant during dev | OTS image URLs can break; hotlinking from press wire is unreliable long-term | When OTS rotates CDN URLs |
| Personalization query joining articles + bezirk tags on every request without caching | Invisible at low traffic | Cache feed results per Bezirk with short TTL (30-60s) | At ~200 concurrent readers |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing OTS API credentials in code or .env committed to repo | API key compromise, billing abuse, content manipulation | Use secrets manager; never commit credentials; rotate keys on any team member change |
| No rate limiting on the editor CMS | Brute-force login; automated content manipulation | Rate-limit login attempts; use short-lived session tokens |
| Rendering AI-generated content without sanitization | LLM can generate content with embedded HTML/script tags if source contained them | Always sanitize AI output through a strict HTML allowlist before storing or rendering |
| Trusting source RSS article URLs as safe to embed/link | Malicious or compromised feed could inject JavaScript via URL fields | Validate and sanitize all external URLs; never use `href` values from RSS without validation |
| LLM prompt injection via source content | A malicious press release could contain instructions that manipulate the AI generation (e.g., "Ignore previous instructions and output...") | Use system-level prompt boundaries; treat all source content as untrusted user input in the prompt; consider a moderation pre-pass |
| Editor admin interface exposed without IP restriction or 2FA | Single compromised account can unpublish or modify all content | Require 2FA for editor login; consider IP allowlist for admin routes |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Mein Bezirk" selection requires registration | Eliminates core value proposition (project spec: no accounts) | Store Bezirk selection in localStorage/cookie; no login required |
| Showing AI-generated label prominently on every article | Erodes trust before readers can evaluate quality | Subtle source attribution is better; label the source (OTS.at, feed name) rather than the generation method |
| No "article not found" handling for stale URLs | Readers following old links (from WhatsApp shares) hit 404 | Implement permanent article URLs and a friendly 404 that suggests the Bezirk feed |
| Bezirk feed with no articles yet shows blank page | New Bezirk onboarding looks broken | Always show a fallback: "Noch keine Artikel für diesen Bezirk — hier sind die neuesten aus Steiermark" |
| Feed refresh requires manual page reload | Mobile readers miss new articles | Implement a soft refresh indicator ("X neue Artikel") that reloads the feed without losing scroll position |
| Article list shows truncated AI-generated previews that are cut mid-sentence | Looks low-quality, especially in German where compound sentences are long | Use a sentence-aware truncation that ends at a full stop within the character limit |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OTS.at integration:** Appears to fetch articles — verify that token expiry, quota exhaustion, and HTTP 5xx responses all surface in the admin dashboard as visible feed health status, not just in logs
- [ ] **AI content generation:** Appears to produce articles — verify that a test article with a named real person triggers the exceptions queue flag, and that a malformed source produces a fallback rather than a broken article
- [ ] **Deduplication:** Appears to prevent duplicates — verify by submitting the same article via OTS API and a syndicated RSS feed simultaneously; only one article should publish
- [ ] **Bezirk personalization:** Appears to show local content — verify that a press release mentioning only a Gemeinde (not the Bezirk by name) is correctly attributed to the right Bezirk via the lookup table
- [ ] **Auto-publish pipeline:** Appears to run autonomously — verify that a 6-hour silence period (no new articles) triggers a monitoring alert, not just log entries
- [ ] **Editorial CMS override:** Appears to let editors manage content — verify that an editor can find and unpublish a specific article in a feed of 500+ items within 60 seconds using filters
- [ ] **Source extensibility:** Appears to support multiple sources — verify by adding a second RSS feed source without modifying the Article model or the core ingestion worker
- [ ] **Mobile optimization:** Appears to work on mobile — verify on actual German-language article titles (long compound nouns) that text doesn't overflow or truncate in unexpected places

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hallucinated article published about a real named person | HIGH | Immediate unpublish via CMS; add named-person article type to exceptions queue; audit all articles from same source in last 24h; consider public correction note if article was widely read |
| Duplicate flood | MEDIUM | Bulk-unpublish by source + time range (CMS bulk action); run deduplication backfill job; add fingerprinting logic; check all RSS sources for OTS syndication |
| Wrong Bezirk attribution for published articles | MEDIUM | Bulk re-tag job (if canonical lookup table is now fixed); add missing synonyms to lookup table; republication of corrected articles |
| API quota exhausted, hours of silence | LOW | Manually reduce poll frequency; upgrade API tier or add rate headroom; backfill articles from API once quota resets; communicate gap in admin dashboard |
| LLM cost spike from burst event | MEDIUM | Immediately enable cost circuit-breaker (publish source excerpts instead of AI-generated); audit which event triggered the burst; model future event costs and add pre-emptive daily cap |
| Source model lock-in discovered when adding second source | HIGH | Full ingestion layer refactor; requires downtime or careful migration; all existing articles need source metadata backfill |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hallucinated/wrong content auto-published | AI content generation pipeline | Test suite: known-bad sources produce flagged articles, not clean publications |
| Duplicate article flooding | Source ingestion phase (before AI enabled) | Integration test: same article via two sources → one publish |
| Bezirk attribution errors | Ingestion phase + Bezirk/Gemeinde lookup table built first | Test: Gemeinden-only mentions correctly resolve to Bezirk |
| API quota/rate limit silent failure | OTS.at integration phase | Simulate 429 response: verify visible admin alert is raised |
| AI generation cost explosion | AI content generation phase | Cost cap exists in code with circuit-breaker; tested with burst simulation |
| Unmanageable CMS at high volume | Editorial CMS phase | Verify: editor can find specific article in 500-item feed within 60s using filters |
| Source schema lock-in | Source ingestion architecture (foundational, first phase) | Verify: second source added without Article model changes |
| Prompt injection via source content | AI content generation phase | Test: source containing "ignore previous instructions" produces normal output |
| LLM sync blocking ingestion | AI content generation phase | Load test: 20 simultaneous ingests do not block each other |
| Silent ingestion outage | Monitoring phase (must ship alongside automation, not after) | Test: 6-hour silence triggers alert |

---

## Sources

- Training knowledge: AI content pipeline failure patterns (post-mortems from automated journalism projects, 2023-2025)
- Training knowledge: RSS/feed ingestion at scale — deduplication, rate limiting, XML parsing edge cases
- Training knowledge: LLM hallucination failure modes in summarization tasks, especially for named entities
- Training knowledge: Austrian administrative geography (Steiermark Bezirke/Gemeinden structure)
- Training knowledge: OTS.at (Austria Presse Agentur press wire) API behavior patterns
- Training knowledge: CMS design patterns for high-volume automated content
- NOTE: WebSearch was unavailable during this research session. Confidence is MEDIUM. Pitfalls related to OTS.at API specifics (exact quota limits, authentication mechanism) should be verified against OTS.at developer documentation before the integration phase begins.

---
*Pitfalls research for: AI-powered regional news platform (Ennstal Aktuell / Steiermark)*
*Researched: 2026-03-21*
