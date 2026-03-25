# Feature Research

**Domain:** AI-powered regional/hyperlocal news platform (Steiermark, Austria)
**Researched:** 2026-03-21
**Confidence:** MEDIUM — all external tools restricted; findings based on training knowledge of the domain (AP Automation, Axios Local, hyperlocal CMS/AI platforms through mid-2025). Flag for verification in phase-specific research.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Article list by Bezirk | Users come specifically for their region — undifferentiated national feed defeats the purpose | LOW | Must be the primary view, not a filter on top of everything |
| "Mein Bezirk" region selector | Hyperlocal = the core promise; without persistent region selection, users re-select every visit | LOW | Store in localStorage/cookie; no account required |
| Article detail page | Standard news reading UX; must be shareable via URL | LOW | Stable slugged URLs for sharing; OG tags for social previews |
| Readable mobile layout | >70% of regional news consumption is mobile; cramped layout kills retention | LOW | Bottom nav pattern (already in design reference), large tap targets, comfortable reading line length |
| Article publication timestamp | Readers need to know if news is current; regional readers especially distrust stale content | LOW | Relative time ("vor 2 Stunden") plus absolute date on hover/tap |
| Source attribution | Readers need to know origin (OTS.at, etc.); builds trust for AI-generated content | LOW | Visible per article; links to original source where available |
| AI-generation disclosure | Legally and ethically required in EU context; readers distrust undisclosed automation | LOW | "Automatisch erstellt" label per article; required for Austrian media law compliance |
| Search within platform | Users looking for specific topics or Bezirke expect to find them | MEDIUM | At minimum: full-text search across articles; Bezirk filter in search |
| RSS feed per Bezirk | Power users and aggregators expect machine-readable feeds; standard for any news site | LOW | One feed per Bezirk + a global feed |
| Responsive images | News without images feels unfinished; slow-loading images on mobile kills engagement | LOW | Lazy loading, WebP format, appropriate srcset breakpoints |
| Consistent German-language UI | Platform serves Steiermark; any English UI strings feel foreign and unprofessional | LOW | All labels, navigation, error messages, and metadata in German |

### Differentiators (Competitive Advantage)

Features that set this platform apart from generic news aggregators or manual regional newsrooms.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Fully autonomous content pipeline | Platform publishes without any human intervention; enables operation at scale no traditional newsroom can match | HIGH | Cron/queue-based ingestion → AI generation → auto-publish; requires robust error handling and deduplication |
| Bezirk-aware AI article generation | AI rewrites source articles with explicit geographic framing ("In Liezen...") rather than generic summaries | MEDIUM | Prompt engineering: inject Bezirk context; geo-tagging logic to assign articles to correct Bezirke |
| Multi-Bezirk coverage at launch | All Steiermark Bezirke covered from day one; competitor hyperlocal sites usually start with one area | HIGH | Data model and routing must be multi-Bezirk by design, not retrofitted |
| Pluggable content source architecture | New RSS feeds and APIs can be added without core changes; enables rapid expansion | HIGH | Adapter pattern per source; each source is a plugin; OTS.at is first adapter |
| Editor override layer (optional, not required) | Editors can curate/pin/edit/remove without blocking the autonomous pipeline; human-in-the-loop is additive | MEDIUM | Admin interface with article CRUD, pin/feature controls, source management; platform continues running without editor action |
| AI-powered article deduplication | Same story from multiple sources does not appear multiple times; keeps feeds clean | MEDIUM | Semantic similarity check (embedding-based or keyword fingerprint) before publishing |
| Contextual Bezirk enrichment | Articles automatically tagged with relevant Bezirke based on content analysis, not just source metadata | MEDIUM | NLP-based location extraction (spaCy/GLiNER or LLM-based) to detect Bezirk mentions; allows one article to appear in multiple Bezirks feeds |
| Automated publishing cadence | Articles spread across time to maintain fresh feed appearance, not all published in a burst after ingestion | LOW | Simple time-delay queue; configurable spread window (e.g., max 3 articles/hour per Bezirk) |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural additions but create disproportionate complexity or conflict with the product's core design.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Reader accounts / registration | Personalization, saved articles, notifications | Adds auth complexity, GDPR surface area, password reset flows; readers come for content not community; "Mein Bezirk" can work without accounts | Persist Bezirk selection in localStorage; no account needed for core value |
| Real-time push notifications | Keeps readers engaged, drives return visits | Requires service worker + push subscription management + a reason to grant permission; most regional readers don't grant push to small-brand sites | RSS feed (already table stakes) satisfies power users; browser-based refresh is sufficient for casual readers |
| Comment sections / reader forums | Community engagement, letters to the editor pattern | Moderation burden, spam, legal liability (§ 1330 ABGB defamation risk); toxic content can destroy brand for small platform | "Leserbriefe"-style email contact; social sharing links per article |
| Paywall / premium content | Revenue model | Contradicts "content is public" constraint; adds subscription infrastructure; kills organic reach for AI-generated content | Establish traffic and trust first; paywall is a v2+ consideration after product-market fit |
| Native iOS/Android app | Better push notifications, home screen presence | Build + App Store review + maintenance cost; mobile web with PWA gives 90% of the value; explicitly out of scope per PROJECT.md | Mobile-optimized web; optionally PWA installability (add to home screen) as low-cost enhancement |
| AI chatbot / Q&A interface | "Ask about your Bezirk" seems compelling | Requires RAG pipeline on top of article corpus, hallucination risk, liability for AI stating incorrect local facts, support burden | Good search + well-structured articles serve the same need without risk |
| Automated social media posting | Drive traffic from Facebook/Instagram/Twitter | Requires OAuth token management, per-platform formatting, error handling per platform API; distraction from core product | Shareable URLs with OG tags let editors share manually; automation adds complexity for uncertain gain in v1 |
| Multi-language support | Austria has Hungarian/Slovenian minorities in Steiermark | Very low usage volume; translating AI-generated German articles adds cost and QA overhead | German-only is correct for v1; add if specific minority-language demand is validated |
| Real-time article updates | "Breaking news" ticker, live-updating feeds | Adds WebSocket/SSE infrastructure; for regional news the velocity doesn't justify it; most stories don't break within the same browser session | Periodic page refresh or simple pull-to-refresh on mobile is sufficient |

---

## Feature Dependencies

```
[Bezirk Selector — "Mein Bezirk"]
    └──requires──> [Bezirk Data Model] (list of all Steiermark Bezirke)
                       └──enables──> [Bezirk-Filtered Article Feed]
                                         └──requires──> [Bezirk Tagging on Articles]
                                                            └──requires──> [Content Ingestion Pipeline]
                                                                               └──requires──> [Source Adapters (OTS.at first)]

[AI Article Generation]
    └──requires──> [Content Ingestion Pipeline]
    └──requires──> [LLM API Integration]
    └──requires──> [Bezirk Context Injection in Prompts]
                       └──requires──> [Bezirk Data Model]

[AI Disclosure Label]
    └──requires──> [AI Article Generation]
    └──requires──> [Article metadata flag: ai_generated=true]

[Deduplication]
    └──requires──> [Content Ingestion Pipeline]
    └──enhances──> [AI Article Generation] (prevents duplicate articles being generated)

[Editor Override Layer]
    └──requires──> [Article data model with editable fields]
    └──requires──> [Admin authentication (internal only)]
    └──enhances──> [Bezirk-Filtered Article Feed] (pinned/featured articles appear top)

[RSS Feeds per Bezirk]
    └──requires──> [Bezirk-Filtered Article Feed]
    └──requires──> [Stable article URLs]

[Search]
    └──requires──> [Article corpus in searchable store]
    └──enhances──> [Bezirk Selector] (can filter search by Bezirk)
```

### Dependency Notes

- **Bezirk Data Model is foundational:** Nearly every feature depends on the canonical list of Steiermark Bezirke with consistent slugs/IDs. This must be defined first and must not change later (URL stability).
- **Content Ingestion Pipeline gates everything:** AI generation, deduplication, geo-tagging, and publishing all depend on a working ingestion pipeline. This is the highest-priority infrastructure piece.
- **AI generation requires Bezirk context:** Without Bezirk injection in prompts, generated articles are generic; the core value proposition is lost.
- **Editor Override enhances but does not gate:** The platform must function without editor action. The override layer is additive.
- **Deduplication should precede publishing:** Running dedup after AI generation wastes LLM API cost. Check for duplicates at ingestion time, before generation is triggered.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate that Steiermark residents use an autonomous hyperlocal news platform.

- [ ] **Content ingestion pipeline with OTS.at adapter** — without this nothing is published; must run on schedule without manual triggering
- [ ] **AI article generation with Bezirk context** — the core value proposition; generic summaries are not enough
- [ ] **AI-generation disclosure label** — legally required in EU/Austria; non-negotiable
- [ ] **Bezirk data model (all Steiermark Bezirke)** — multi-region from day one per project decision
- [ ] **"Mein Bezirk" region selector** — the primary reader personalization; persisted in localStorage
- [ ] **Bezirk-filtered article feed** — homepage is the Bezirk feed; not a global feed with filters
- [ ] **Article detail page with stable URLs** — required for sharing and for RSS
- [ ] **Source attribution per article** — trust signal; links back to OTS.at source
- [ ] **Article timestamp (relative + absolute)** — freshness signal; critical for news
- [ ] **Mobile-optimized layout** — bottom nav pattern per existing design; >70% of users are mobile
- [ ] **Editor admin interface** — pin, feature, edit, remove, manual publish; makes the platform manageable
- [ ] **Auto-publish pipeline (no draft queue)** — per project decision; platform runs autonomously
- [ ] **RSS feed per Bezirk** — standard expectation for any news site; low implementation cost

### Add After Validation (v1.x)

Features to add once the autonomous pipeline is proven and readers are returning.

- [ ] **Article deduplication** — important for quality but not strictly required for initial validation; add when content volume grows
- [ ] **Contextual Bezirk enrichment (multi-Bezirk tagging)** — improves coverage breadth; add when OTS.at volume is understood
- [ ] **Full-text search** — add when article corpus is large enough to justify (>500 articles)
- [ ] **Additional source adapters (RSS feeds beyond OTS.at)** — expand after OTS.at pipeline is stable
- [ ] **Automated publishing cadence / time-spread queue** — add when burst publishing is observed as a problem

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **PWA installability ("Add to Home Screen")** — low cost enhancement but not required for v1 validation
- [ ] **Per-article OG images (AI-generated or sourced)** — improves social sharing; adds image generation cost; defer until sharing is validated as a traffic source
- [ ] **Analytics dashboard for editors** — which Bezirke, which topics get engagement; needs traffic first to be meaningful
- [ ] **Paywall / monetization** — explicitly out of scope per PROJECT.md; revisit after establishing readership

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Content ingestion pipeline (OTS.at) | HIGH | HIGH | P1 |
| AI article generation with Bezirk context | HIGH | HIGH | P1 |
| "Mein Bezirk" selector + Bezirk feed | HIGH | LOW | P1 |
| Article detail + stable URLs | HIGH | LOW | P1 |
| AI disclosure label | HIGH | LOW | P1 |
| Mobile-optimized layout | HIGH | LOW | P1 |
| Source attribution | MEDIUM | LOW | P1 |
| Article timestamp | MEDIUM | LOW | P1 |
| Editor admin interface | MEDIUM | MEDIUM | P1 |
| Auto-publish pipeline | HIGH | MEDIUM | P1 |
| RSS feed per Bezirk | MEDIUM | LOW | P1 |
| Article deduplication | MEDIUM | MEDIUM | P2 |
| Multi-Bezirk tagging (NLP) | MEDIUM | MEDIUM | P2 |
| Full-text search | MEDIUM | MEDIUM | P2 |
| Additional source adapters | HIGH | MEDIUM | P2 |
| Publishing cadence / spread queue | LOW | LOW | P2 |
| PWA installability | LOW | LOW | P3 |
| AI-generated OG images | LOW | MEDIUM | P3 |
| Editor analytics dashboard | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Note: Direct competitors operating AI-autonomous regional news platforms in German-language Austria are not known to this researcher as of mid-2025 (LOW confidence on this claim — verify). The comparison below draws from analogous platforms.

| Feature | AP Automated Insights (US) | Axios Local | Broadsheet / AI-local startups | Our Approach |
|---------|----------------------------|-------------|-------------------------------|--------------|
| AI content generation | Template-based NLG from structured data | Human-written; AI assist only | LLM-based full generation | LLM-based with Bezirk context injection |
| Region coverage | National sports/finance, not hyperlocal | Single-city newsletters | Varies (usually single city) | All Steiermark Bezirke from day one |
| Content sources | Proprietary data feeds | Reporters + wire services | RSS/scraping | OTS.at API + extensible RSS adapters |
| Editorial control | None (fully automated) | Human-first | Varies | Optional human override; autonomous default |
| Reader personalization | None | Newsletter subscription = region | App-based, limited | Bezirk selector, no account required |
| Business model | B2B licensing | Sponsorships/subscriptions | Ads/subscriptions | TBD (not v1 concern) |
| Mobile UX | Web/app | Email newsletter primary | Web | Mobile-optimized web, bottom nav |

---

## Domain-Specific Considerations for Steiermark / Austria

These are not captured in generic hyperlocal platform research but are specific to this context:

1. **OTS.at (Originaltext-Service):** Austrian press wire used by companies, government bodies, and organizations for official announcements. Content is press-release style, not breaking news. Articles generated from OTS will lean institutional/official — AI prompting should adapt tone for a general readership.

2. **Bezirk as the unit of geography:** Steiermark has 12 Bezirke. "Mein Bezirk" maps cleanly to this administrative unit. Articles about "Graz" must be tagged to "Graz-Stadt" and/or "Graz-Umgebung" depending on content. This disambiguation is a known complexity.

3. **Austrian media law (MedienG, ECG):** AI-generated content disclosure is required. The "Impressum" (legal notice) is mandatory for Austrian news sites. This is a hard launch requirement, not optional.

4. **German compound nouns and regional dialect:** Standard High German is appropriate. AI generation prompts should specify "klares Hochdeutsch, kein Dialekt" to avoid Styrian dialect expressions in generated articles.

5. **Trust gap for AI news in German-language markets:** German-speaking audiences are known to be skeptical of AI-generated content (Vertrauensfrage). Transparent labeling and visible source attribution are trust-critical, not just ethical nice-to-haves.

---

## Sources

- Domain knowledge: AP Automated Insights, Axios Local, hyperlocal news industry through mid-2025 (MEDIUM confidence — training data)
- Austrian regulatory context: Mediengesetz (MedienG), ECG (E-Commerce-Gesetz) (HIGH confidence for requirement existence; verify specific provisions)
- OTS.at product characteristics: training knowledge (MEDIUM confidence — verify with OTS.at API documentation during implementation)
- Competitor analysis: inference from publicly documented platforms, no direct competitive intelligence on Austrian German-language AI news (LOW confidence — verify pre-launch)
- Bezirk geography: Steiermark has 12 Bezirke — verify exact slugs/IDs with official Statistik Austria data during Bezirk data model implementation

**Note:** All external research tools (WebSearch, WebFetch, Bash, Context7) were restricted during this research session. All findings derive from training knowledge. Every claim should be re-verified during phase-specific research when tools are available.

---
*Feature research for: AI-powered regional news platform (Ennstal Aktuell / Regionalprojekt)*
*Researched: 2026-03-21*
