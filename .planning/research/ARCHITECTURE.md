# Architecture Research

**Domain:** AI-powered regional news aggregation and publishing platform
**Researched:** 2026-03-21
**Confidence:** MEDIUM (training data, no live web search available — patterns are well-established but library-specific details unverified)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ OTS.at API │  │  RSS Feed  │  │  RSS Feed  │  │ Future API │  │
│  │  Adapter   │  │ Adapter A  │  │ Adapter B  │  │  Adapter N │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  │
│        └───────────────┴───────────────┴───────────────┘         │
│                              │                                    │
│                    ┌─────────▼──────────┐                         │
│                    │  Ingestion Queue   │  (dedup + normalize)    │
│                    └─────────┬──────────┘                         │
├──────────────────────────────┼───────────────────────────────────┤
│                     AI PROCESSING LAYER                           │
├──────────────────────────────┼───────────────────────────────────┤
│                    ┌─────────▼──────────┐                         │
│                    │   AI Pipeline      │                         │
│                    │ ┌────────────────┐ │                         │
│                    │ │ Bezirk Tagger  │ │  (classify by region)  │
│                    │ ├────────────────┤ │                         │
│                    │ │ Article Writer │ │  (LLM rewrite/expand)  │
│                    │ ├────────────────┤ │                         │
│                    │ │ Image Selector │ │  (pick or gen image)   │
│                    │ └────────────────┘ │                         │
│                    └─────────┬──────────┘                         │
├──────────────────────────────┼───────────────────────────────────┤
│                        CONTENT STORE                              │
├──────────────────────────────┼───────────────────────────────────┤
│  ┌──────────────────┐        │        ┌─────────────────────────┐ │
│  │  Articles DB     │◄───────┘        │   Source Raw Cache      │ │
│  │  (with Bezirk    │                 │   (deduplicate check)   │ │
│  │   associations)  │                 └─────────────────────────┘ │
│  └────────┬─────────┘                                             │
├───────────┼──────────────────────────────────────────────────────┤
│           │              DELIVERY LAYER                           │
├───────────┼──────────────────────────────────────────────────────┤
│  ┌────────▼─────────┐           ┌──────────────────────────────┐  │
│  │  Editorial CMS   │           │     Reader Frontend           │  │
│  │  (admin UI)      │           │  (Mein Bezirk / public site) │  │
│  └──────────────────┘           └──────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────┐                                              │
│  │  Scheduler       │  (cron / job runner for pipeline triggers)  │
│  └──────────────────┘                                              │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Source Adapter | Fetch raw content from one external source; normalize to internal format | One file/class per source; implements shared interface |
| Ingestion Queue | Deduplication, rate-limit buffering, ordering | Database table with status flags OR lightweight queue (BullMQ/pg-based) |
| Bezirk Tagger | Classify each article to zero or more Steiermark Bezirke | LLM prompt + fallback keyword matching against Bezirk geography list |
| Article Writer | Rewrite source material into German-language article in platform voice | LLM (GPT-4o / Claude) with structured output |
| Articles DB | Canonical store for all published and draft articles with Bezirk associations | PostgreSQL with junction table for article↔Bezirk |
| Source Raw Cache | Store raw fetched content to enable deduplication and audit | DB table or simple hash store keyed on source URL / content hash |
| Editorial CMS | Admin UI: write, edit, pin, feature, remove any article | Next.js admin route or separate CMS route group |
| Reader Frontend | Public site: Bezirk filter, article list, article detail | Next.js (SSR/ISR) or SvelteKit |
| Scheduler | Trigger ingestion runs on interval; retry failed AI jobs | node-cron, Vercel Cron, or database-driven polling |

## Recommended Project Structure

```
src/
├── ingestion/                # Source adapters + ingestion queue logic
│   ├── adapters/
│   │   ├── ots.ts            # OTS.at API adapter
│   │   ├── rss.ts            # Generic RSS adapter (reusable)
│   │   └── index.ts          # Adapter registry (plug-in pattern)
│   ├── dedup.ts              # Content hash / URL deduplication
│   └── queue.ts              # Job queue interface
│
├── ai/                       # AI processing pipeline
│   ├── tagger.ts             # Bezirk classification
│   ├── writer.ts             # Article generation
│   ├── prompts/              # Prompt templates (versioned)
│   └── pipeline.ts           # Orchestrates tagger → writer → save
│
├── content/                  # Data access layer for articles
│   ├── articles.ts           # CRUD for articles
│   ├── bezirke.ts            # Bezirk reference data + lookup
│   └── sources.ts            # Source feed registry
│
├── cms/                      # Editorial interface (admin)
│   ├── app/                  # Next.js app dir routes for /admin
│   └── components/
│
├── site/                     # Reader-facing frontend
│   ├── app/                  # Next.js app dir routes for public site
│   └── components/
│
├── scheduler/                # Cron / job runner
│   └── jobs.ts
│
└── db/                       # Schema, migrations, connection
    ├── schema.ts             # Drizzle / Prisma schema
    └── migrations/
```

### Structure Rationale

- **ingestion/:** Isolated from AI so adapters can be added without touching processing logic. The adapter registry enables plug-in extensibility without core changes.
- **ai/:** Separate from ingestion and content — swapping LLM providers or prompt strategies doesn't touch data layer.
- **content/:** Single data access layer shared by CMS, site, and pipeline. Prevents each consumer from building its own DB queries.
- **cms/ and site/:** Separate route groups but can share components. CMS is authenticated, site is public — different middleware.
- **scheduler/:** Thin wrapper around cron logic; references ingestion and ai but owns no business logic itself.

## Architectural Patterns

### Pattern 1: Plug-in Source Adapter Registry

**What:** All source adapters implement a shared `SourceAdapter` interface. A central registry maps source identifiers to adapter instances. The ingestion runner iterates the registry without knowing about specific sources.

**When to use:** Any time a new feed or API must be addable without touching core ingestion logic. This satisfies the PROJECT.md extensibility constraint directly.

**Trade-offs:** Adds a small abstraction layer early; pays off immediately when the second source is added.

**Example:**
```typescript
interface SourceAdapter {
  sourceId: string;
  fetchLatest(): Promise<RawItem[]>;
}

// adapters/index.ts
export const adapters: SourceAdapter[] = [
  new OtsAdapter(process.env.OTS_API_KEY),
  new RssFeedAdapter('https://example.at/feed.xml'),
];

// ingestion runner
for (const adapter of adapters) {
  const items = await adapter.fetchLatest();
  await enqueueForProcessing(items);
}
```

### Pattern 2: Staged Pipeline with Status Flags

**What:** Each ingested item passes through discrete stages tracked in the database: `fetched → deduped → tagged → written → published`. Status flags allow the scheduler to resume failed items, and editors can see pipeline state.

**When to use:** Any pipeline with retryable async steps and autonomous operation. Essential for "platform runs unattended" requirement.

**Trade-offs:** Adds one status column and one updated_at timestamp per item. Eliminates need for a separate queue infrastructure at launch scale.

**Example:**
```typescript
type PipelineStatus =
  | 'fetched'
  | 'duplicate'
  | 'tagging'
  | 'tagged'
  | 'writing'
  | 'published'
  | 'error';

// Scheduler retries anything stuck in 'tagging' or 'writing' for > 10 min
```

### Pattern 3: Bezirk Junction Table (Many-to-Many)

**What:** Articles and Bezirke are in a many-to-many relationship. One article can cover multiple Bezirke (e.g., a flooding report covering Liezen and Murau). A junction table `article_bezirke(article_id, bezirk_id)` is the canonical mapping.

**When to use:** Any multi-region news platform. Required from day one since all Steiermark Bezirke are in scope at launch.

**Trade-offs:** Slightly more complex queries for filtering; necessary to avoid the "one Bezirk column" trap that breaks multi-region articles.

**Example:**
```sql
-- Reader selects Liezen: fetch articles associated with bezirk_id = 'liezen'
SELECT a.* FROM articles a
JOIN article_bezirke ab ON ab.article_id = a.id
WHERE ab.bezirk_id = $1
ORDER BY a.published_at DESC;
```

### Pattern 4: ISR / On-Demand Revalidation for Reader Frontend

**What:** The public site uses Incremental Static Regeneration (Next.js) or equivalent. Pages are statically rendered but revalidated on a short interval (e.g., 60 seconds) or triggered on article publish. This avoids SSR cost for every reader hit while keeping content fresh.

**When to use:** News sites with high read:write ratio and autonomous publish pipeline.

**Trade-offs:** Content may be up to N seconds stale. Acceptable for regional news; fine at launch scale.

## Data Flow

### Ingestion Flow (automated, recurring)

```
Scheduler (cron every N minutes)
    ↓
Adapter Registry → fetch each source
    ↓
Deduplication check (hash / URL against raw cache)
    ↓ (new items only)
Ingestion Queue (insert row with status='fetched')
    ↓
AI Pipeline worker reads 'fetched' rows
    ├── Bezirk Tagger → LLM classifies regions → status='tagged'
    └── Article Writer → LLM generates German article text → status='written'
    ↓
Auto-publish: status='published', published_at=now()
    ↓
Frontend revalidation triggered (webhook or TTL expiry)
```

### Editorial Override Flow

```
Editor (CMS admin UI)
    ├── Write new article → insert directly as status='published'
    ├── Edit AI article → update content, set edited_by, keep published
    ├── Pin article → set pinned=true, pinned_bezirk=[...ids]
    └── Remove article → set status='removed' (soft delete)
```

### Reader Request Flow

```
Reader opens site → selects "Mein Bezirk" (stored in localStorage/cookie)
    ↓
Next.js page request with bezirk param
    ↓ (cache hit: serve static)
    ↓ (cache miss / stale: query DB)
Articles DB → JOIN article_bezirke WHERE bezirk_id = $bezirk
    → ORDER BY pinned DESC, published_at DESC
    ↓
Rendered article list → reader
```

### Key Data Flows

1. **Source raw → published article:** Adapter fetch → dedup → AI tag → AI write → DB insert → frontend cache
2. **Editor action → live on site:** CMS write/edit → DB update → revalidation trigger → frontend cache cleared
3. **Bezirk filter:** Reader selection → cookie/localStorage → all API/page requests scoped by bezirk_id
4. **Retry flow:** Scheduler polls for items in `status='error'` or stuck in transitional states beyond timeout → re-enqueues

## Multi-Region / Bezirk Data Model

```
bezirke
  id          TEXT PK  (e.g. 'liezen', 'graz-umgebung')
  name        TEXT     (e.g. 'Liezen', 'Graz-Umgebung')
  slug        TEXT     (URL-safe)
  region      TEXT     (grouping for navigation, e.g. 'Obersteiermark')

articles
  id          UUID PK
  title       TEXT
  body        TEXT
  summary     TEXT
  source_url  TEXT
  source_id   TEXT     (FK to sources)
  status      TEXT     (pipeline status enum)
  pinned      BOOL
  published_at TIMESTAMPTZ
  created_at  TIMESTAMPTZ
  edited_by   TEXT NULL  (set when editor touches it)

article_bezirke
  article_id  UUID FK → articles.id
  bezirk_id   TEXT FK → bezirke.id
  PRIMARY KEY (article_id, bezirk_id)

sources
  id          TEXT PK  (e.g. 'ots', 'meinbezirk-rss')
  adapter     TEXT     (adapter class identifier)
  config      JSONB    (URL, API key ref, polling interval)
  enabled     BOOL
```

**Rationale:** Sources table makes the adapter registry database-driven — new feeds can be added via CMS config panel without code deploys. Config stored as JSONB allows per-adapter configuration shape without schema migrations per new feed type.

## Scheduling / Automation Architecture

```
Scheduler process (single, lightweight)
    │
    ├── Ingestion job (every 15–30 min per source)
    │     └── calls adapter → enqueues new items
    │
    ├── Pipeline worker (continuous or every 2–5 min)
    │     └── processes 'fetched' items through AI pipeline
    │
    └── Cleanup job (daily)
          └── archives old raw cache, purges 'removed' articles
```

**Implementation choice:** At launch scale, a single Node.js process with `node-cron` is sufficient. No separate queue infrastructure (Redis/RabbitMQ) needed until volume justifies it. The status-flag pattern in the DB serves as a durable queue. Vercel Cron or similar managed cron can replace this if deploying serverlessly.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–10k monthly readers | Monolith fine: Next.js app with integrated API routes, single Postgres instance, node-cron scheduler in same process or separate dyno |
| 10k–500k monthly readers | Add read replica for Postgres; move scheduler to separate process; add CDN in front of Next.js for article pages |
| 500k+ monthly readers | Consider separating ingestion worker from web process; evaluate Redis for queue if AI job volume spikes; add DB connection pooling (PgBouncer) |

### Scaling Priorities

1. **First bottleneck:** Database read load from article list queries. Fix: ISR caching and read replica. Bezirk-filtered queries need an index on `article_bezirke(bezirk_id)` and `articles(published_at)`.
2. **Second bottleneck:** LLM API latency in the AI pipeline. Fix: Batch processing, async pipeline — AI jobs should never block reader requests (separate process/worker).

## Anti-Patterns

### Anti-Pattern 1: Single Bezirk Column on Articles

**What people do:** Add `bezirk TEXT` column directly to articles table.
**Why it's wrong:** An article about flooding affecting Liezen, Murau, and Leoben cannot be correctly associated. Results in either data duplication or missing cross-Bezirk coverage.
**Do this instead:** Many-to-many junction table `article_bezirke` from day one.

### Anti-Pattern 2: Blocking AI Calls in Web Request Path

**What people do:** When an editor previews an article, trigger AI generation inline in the HTTP request.
**Why it's wrong:** LLM API calls take 2–15 seconds. Blocks the request, causes timeouts, terrible UX.
**Do this instead:** All AI processing happens in background worker. Web routes only read/write DB state, never call LLM directly.

### Anti-Pattern 3: Hardcoded Source Adapters

**What people do:** Write ingestion logic with OTS-specific code scattered throughout the pipeline runner.
**Why it's wrong:** Adding a second source requires touching core pipeline code. Violates the PROJECT.md extensibility requirement.
**Do this instead:** Adapter interface + registry from day one. OTS adapter is the first implementation of the interface, not the interface itself.

### Anti-Pattern 4: Storing Raw LLM Output Directly as Article Body

**What people do:** Take LLM response string, insert directly into `articles.body`.
**Why it's wrong:** LLM output is inconsistent in format. HTML vs markdown, extra prose, JSON wrapper artifacts. No way to reprocess without re-calling LLM.
**Do this instead:** Define structured output schema (JSON with `title`, `body`, `summary`, `tags`). Validate output before storing. Store raw LLM response separately for debugging.

### Anti-Pattern 5: No Deduplication Before AI Processing

**What people do:** Run AI pipeline on every fetched item, including items already processed on previous runs.
**Why it's wrong:** Identical stories get re-generated every cron cycle. Wastes LLM API budget. Pollutes article list with near-duplicate content.
**Do this instead:** Hash source URL + content fingerprint before enqueuing. Check against raw cache. Skip if already processed.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OTS.at API | REST API polling via adapter; API key in env | Rate limits unknown — adapter should respect retry-after headers |
| OpenAI / Anthropic API | HTTP calls from AI pipeline worker | Structured outputs (JSON mode) preferred; costs accumulate fast without dedup |
| RSS feeds | HTTP GET + XML parse (e.g., `rss-parser` npm) | Handle malformed XML gracefully; some feeds require User-Agent header |
| Image sources | If auto-images: Unsplash API or similar royalty-free; if manual: CMS upload | Start with no auto-images; add as enhancement |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Ingestion → AI Pipeline | Database status flags (decoupled) | Ingestion writes `status='fetched'`; pipeline worker polls for it |
| AI Pipeline → Content Store | Direct DB write via content layer | Pipeline calls `content/articles.ts` functions, not raw SQL |
| Content Store → CMS | Shared data access layer | CMS uses same `content/` functions as pipeline — single source of truth |
| Content Store → Reader Frontend | Next.js data fetching (server components or API routes) | No direct DB access from client components |
| Scheduler → Ingestion/Pipeline | Function calls or HTTP to internal endpoint | Keep scheduler thin — it only triggers, doesn't contain logic |

## Build Order (Dependency Chain)

Based on component dependencies, the build order is:

```
1. DB Schema + Bezirk reference data
        ↓
2. Content data access layer (content/)
        ↓
3. Source adapter interface + OTS adapter
        ↓
4. Ingestion queue + deduplication
        ↓
5. AI pipeline (tagger + writer)
        ↓
6. Scheduler / automation
        ↓
7. Editorial CMS (reads/writes content layer)
        ↓
8. Reader frontend (reads content layer)
```

**Rationale:**
- Schema must exist before any other component can persist data.
- The content data access layer is depended on by both pipeline and delivery; build it before either.
- Ingestion and AI pipeline are purely backend — they can be built and tested without a frontend.
- CMS and reader frontend are independent of each other at this point; can be built in parallel.
- Scheduler is wired last to connect ingestion → AI pipeline as a complete automated loop.

## Sources

- Architecture patterns synthesized from training knowledge of news aggregation systems, headless CMS patterns, and AI pipeline design (cutoff August 2025). No live web search was available.
- PROJECT.md requirements drove component boundary and data model decisions directly.
- Confidence: MEDIUM — these are well-established patterns for this system type. Specific library versions and API details should be verified during implementation phases.

---
*Architecture research for: AI-powered regional news platform (Regionalprojekt / Ennstal Aktuell)*
*Researched: 2026-03-21*
