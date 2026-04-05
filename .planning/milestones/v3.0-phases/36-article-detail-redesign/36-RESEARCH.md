# Phase 36: Article Detail Redesign - Research

**Researched:** 2026-04-01
**Domain:** CSS drop caps, editorial typography, responsive sidebar layout, overlapping hero header — Tailwind v4 / Next.js 15 / React 19
**Confidence:** HIGH

## Summary

Phase 36 transforms the article detail page (`/artikel/[publicId]/[slug]/page.tsx`) from a minimal single-column layout into a premium editorial print experience. Four discrete visual improvements are required: a float-based drop cap on the first paragraph (ARTC-01), blockquote styling with serif italic and tonal dividers (ARTC-02), a desktop sidebar with metadata/sharing and a mobile metadata strip (ARTC-03), and an Archival Header where the article title overlaps the hero image (ARTC-04).

The current article page is a Server Component with no separate component files — all JSX lives in `page.tsx`. The refactor will extract an `ArticleDetailLayout` (or equivalent) component and introduce an `ArticleSidebar` client component (for the share button) while keeping the page itself a Server Component. No new npm packages are needed; all four requirements are achievable with Tailwind v4 utilities and CSS custom properties already defined in `globals.css`.

Key constraints from project decisions: `@tailwindcss/typography` is explicitly out of scope (incompatible with Tailwind v4), `initial-letter` CSS property is out of scope (Firefox unsupported), float-based `::first-letter` is the mandated approach. The `first-letter:` variant is confirmed present in Tailwind v4.2.2 (`lib.js` maps it to `&::first-letter`).

**Primary recommendation:** Implement ARTC-04 (Archival Header) first as it restructures the hero/header markup, then add the body typography treatments (ARTC-01, ARTC-02), then add the sidebar/metadata strip (ARTC-03).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARTC-01 | Article body first paragraph displays a float-based drop cap using `::first-letter` — visible in Firefox, Chrome, Safari | Tailwind v4 `first-letter:` variant confirmed in lib.js; float-based technique works cross-browser. Apply to first `<p>` only using a wrapper class or targeting the first child. Requires knowing the 3:5 spacing rhythm and Newsreader serif font. |
| ARTC-02 | Blockquotes in article bodies render with large serif italic typography and tonal dividers — visually distinct from body prose | Article content is plain text split on `\n\n` — blockquotes must be detected by convention (lines starting with `>` or a `---quote---` delimiter) or rendered as a dedicated prose block type. Research shows plain-text detection is the correct approach since there is no rich-text content field. |
| ARTC-03 | Desktop: sticky sidebar with author/source attribution, estimated reading time, share button. Mobile: horizontal metadata strip | Two-column grid layout (`lg:grid-cols-[1fr_260px]`) with a `sticky top-[4.25rem]` sidebar. Reading time is computed inline (words / 200 wpm). ShareButton already exists. |
| ARTC-04 | Article header uses Archival Header pattern — title overlaps hero image rather than sitting below it | Absolute positioning or negative-margin overlap. Hero image as background with `position: relative`, title as `absolute bottom-0` or via `z-10` overlay. Pattern already proven in `HeroArticle.tsx` on the homepage. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router, Server Components | Project baseline — article page is already a Server Component |
| React | 19.2.4 | UI components | Project baseline |
| Tailwind v4 | 4.2.2 | Utility classes, `@theme` tokens, `first-letter:` variant | Project baseline — all tokens in `globals.css` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | All four requirements are achievable with existing stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Float-based `::first-letter` | CSS `initial-letter` | `initial-letter` is out of scope — Firefox unsupported per project decision |
| Float-based `::first-letter` | `@tailwindcss/typography` drop cap | `@tailwindcss/typography` is out of scope — incompatible with Tailwind v4 per project decision |
| Plain-text blockquote detection | Rich-text content field | Article `content` is a plain `String?` field — no structured content. Detection approach is forced. |
| Inline reading time calculation | `reading-time` npm package | 200 wpm word-count division is two lines of code — no package needed |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(public)/artikel/[publicId]/[slug]/
│   └── page.tsx                      # modify — Archival Header, sidebar layout, body typography
├── components/reader/
│   ├── ArticleSidebar.tsx            # NEW — client component (contains ShareButton)
│   └── ShareButton.tsx               # existing — reuse as-is
└── app/globals.css                   # add .drop-cap and .article-blockquote utility classes
```

### Pattern 1: Archival Header (ARTC-04)
**What:** The article title, metadata, and bezirk badge are absolutely positioned over the bottom of the hero image. The image is a relative container; the text sits in an `absolute bottom-0` overlay zone with a gradient scrim for legibility.
**When to use:** Only when `article.imageUrl` is present. When no image exists, the header falls back to a tonal `bg-parchment-dim` zone with the title as normal flow content.
**Example:**
```tsx
// Based on HeroArticle.tsx pattern — already proven in the codebase
{article.imageUrl ? (
  <header className="relative overflow-hidden">
    <img
      src={article.imageUrl}
      alt={article.title ?? ""}
      className="w-full object-cover max-h-[55vh] img-matte"
      loading="eager"
    />
    {/* Gradient scrim for text legibility */}
    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
    {/* Title overlaps image — absolute bottom */}
    <div className="absolute bottom-0 left-0 right-0 p-[var(--spacing-gutter)] pb-8 z-10">
      <h1 className="font-headline text-parchment text-2xl md:text-3xl font-semibold leading-tight">
        {article.title}
      </h1>
    </div>
  </header>
) : (
  <header className="bg-parchment-dim px-[var(--spacing-gutter)] pt-8 pb-6">
    <h1 className="font-headline text-ink text-2xl md:text-3xl font-semibold leading-tight">
      {article.title}
    </h1>
  </header>
)}
```

### Pattern 2: Float-based Drop Cap (ARTC-01)
**What:** A CSS `::first-letter` pseudo-element on the first `<p>` in the article body, sized large and floated left. Applied via a Tailwind `first-letter:` variant or a globals.css utility class.
**When to use:** First paragraph only. Subsequent paragraphs must NOT have the drop cap.
**Key sizing constraint:** Float-based drop cap requires `float: left`, a font-size large enough to span 3–4 lines, and `line-height: 1` on the pseudo-element. Using `font-headline` (Newsreader) for the cap gives a serif drop cap against the `font-body` (Jakarta Sans) body text.

Two valid implementation approaches in Tailwind v4:

**Option A — Tailwind variant classes (preferred):**
```tsx
// Add a class to the first paragraph only
<p className="first-letter:float-left first-letter:font-headline first-letter:text-7xl first-letter:font-semibold first-letter:leading-none first-letter:mr-1 first-letter:text-ink">
  {firstParagraph}
</p>
```

**Option B — globals.css utility class:**
```css
/* globals.css */
.drop-cap::first-letter {
  float: left;
  font-family: var(--font-headline);
  font-size: 5rem;     /* ~4 lines at 1.5 line-height body */
  line-height: 1;
  font-weight: 600;
  color: var(--color-ink);
  margin-right: 0.125rem;
  margin-top: 0.05em;  /* micro-adjust for cap alignment */
}
```

Option B is preferred because `float: left` is not a standard Tailwind utility — there is `float-left` but the combined pseudo-element behavior (especially `margin-right`, `line-height: 1`) is cleaner expressed as a single CSS class rather than six stacked `first-letter:` variants.

### Pattern 3: Sidebar + Metadata Strip (ARTC-03)
**What:** Desktop: two-column grid where the right column contains a sticky `ArticleSidebar`. Mobile: a horizontal flex strip above the article body.
**When to use:** Always on article pages.

```tsx
{/* Mobile metadata strip — visible below lg */}
<div className="lg:hidden flex items-center gap-4 text-sm text-slate py-3 mb-4 border-b border-parchment-dim">
  <span>{sourceLabel}</span>
  <span>{readingTime} Min. Lesezeit</span>
  <ShareButton title={...} url={...} />
</div>

{/* Desktop two-column layout — grid only on lg+ */}
<div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-8">
  {/* Article body — left column */}
  <div>
    <article>{/* body */}</article>
  </div>

  {/* Sidebar — right column, hidden on mobile */}
  <aside className="hidden lg:block">
    <ArticleSidebar ... />  {/* sticky inside */}
  </aside>
</div>
```

`ArticleSidebar` is a client component because it contains `ShareButton` (already a client component). The sidebar itself uses `sticky top-[4.25rem]` — the WurzelAppBar is `sticky top-0` with a 4px flag stripe + 56px (h-14) header = 60px total = `top-[3.75rem]`. Use `top-[4rem]` (64px) for a small gap.

### Pattern 4: Blockquote Detection and Styling (ARTC-02)
**What:** Article `content` is plain text split on `\n\n`. Blockquotes must be detected from the raw text. The most pragmatic convention is: paragraphs starting with `"` (German opening quote) or `>` are treated as pull quotes.
**Implementation:**
```tsx
{(article.content ?? "").split("\n\n").map((paragraph, index) => {
  const isBlockquote = paragraph.startsWith(">") || paragraph.startsWith("\u201E");
  const text = paragraph.replace(/^[>"»\u201E]\s*/, "");
  if (isBlockquote) {
    return <blockquote key={index} className="article-blockquote">{text}</blockquote>;
  }
  return (
    <p key={index} className={index === 0 ? "drop-cap" : ""}>
      {paragraph}
    </p>
  );
})}
```

Blockquote CSS in `globals.css`:
```css
.article-blockquote {
  font-family: var(--font-headline);
  font-style: italic;
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--color-ink-soft);
  margin: var(--spacing-vertical) 0;
  padding: var(--spacing-vertical) var(--spacing-gutter);
  border-top: 1px solid var(--color-parchment-dim);
  border-bottom: 1px solid var(--color-parchment-dim);
  background: var(--color-parchment-dim);
}
```

**Note:** The `border` here is on a blockquote structural element (a tonal divider, not a separation between list items) — this does NOT violate TOKN-02, which prohibits borders only on "reader-facing component" separation (section/card borders). A blockquote divider line is typographic decoration, not structural separation.

### Reading Time Calculation
```ts
// Inline utility — no package needed
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
```

### Anti-Patterns to Avoid
- **Applying drop cap to all paragraphs:** The `.drop-cap` class or `first-letter:` variants must be applied ONLY to the first paragraph (`index === 0` in the map).
- **Using `initial-letter`:** Out of scope. Firefox does not support it.
- **Using `@tailwindcss/typography` prose modifiers for drop cap:** Out of scope. The plugin is incompatible with Tailwind v4.
- **Nesting `<button>` inside `<Link>`:** ShareButton is a `<button>`, so it cannot be inside an `<a>` wrapper. In the sidebar context this is fine — the sidebar is not wrapped in a Link.
- **`sticky` sidebar offset miscalculation:** The WurzelAppBar is 4px (flag stripe) + 56px (h-14) = 60px. Use `top-[3.75rem]` (60px) or `top-[4rem]` (64px with breathing room).
- **Prose class on article body:** The current page uses `className="prose max-w-none ..."`. With the sidebar layout, `max-w-none` is correct (the grid column constrains width), but `prose` should be removed if using custom paragraph rendering — `prose` generates its own `::first-letter` reset in some configurations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading time | Custom NLP word counter | `content.trim().split(/\s+/).length / 200` | Two lines is sufficient; 200 wpm is the standard editorial estimate |
| Share functionality | Custom share drawer | `ShareButton.tsx` (already exists) | Handles `navigator.share` + clipboard fallback, already styled with Archivist tokens |
| Drop cap font loading | Manual font injection | Newsreader is already loaded via `next/font` in root layout | Font is available via `--font-headline` CSS variable |

---

## Common Pitfalls

### Pitfall 1: Drop Cap and Line Breaks
**What goes wrong:** A float-left `::first-letter` with a large font-size causes the first few lines of the paragraph to wrap around the cap. If the paragraph is very short (1–2 lines), the float overflows into the next paragraph.
**Why it happens:** CSS floats escape normal flow.
**How to avoid:** Add `overflow: hidden` or `display: flow-root` to the paragraph container, or add a `clear: both` on the element following the drop-cap paragraph. In practice: add `after:clear-both after:block after:content-['']` or simply `overflow-hidden` to the first `<p>`.
**Warning signs:** Second paragraph text appearing beside the drop cap rather than below it.

### Pitfall 2: Sticky Sidebar Scroll Container
**What goes wrong:** `sticky` positioning does not work if any ancestor has `overflow: hidden` or `overflow: auto`.
**Why it happens:** `sticky` is relative to the nearest scrolling ancestor — if that ancestor clips overflow, the element stops sticking.
**How to avoid:** Ensure the two-column grid wrapper and all ancestors up to `<main>` have default `overflow` (auto/visible). The current `<main className="flex-1 pb-20">` in `PublicLayout` does not set overflow, so this should be safe.
**Warning signs:** Sidebar scrolls away with content instead of sticking.

### Pitfall 3: Archival Header Without Image
**What goes wrong:** If `article.imageUrl` is null, the absolute-positioned title has no container height to sit in — it renders at 0 height.
**Why it happens:** The `relative` container collapses when there is no image.
**How to avoid:** Always provide a fallback non-image header layout (tonal `bg-parchment-dim` block with normal-flow title). This is already flagged in Pattern 1 above.
**Warning signs:** Articles without images showing only the body, no visible title.

### Pitfall 4: `prose` Class Conflict with Custom Rendering
**What goes wrong:** The current article body uses `className="prose ..."`. Tailwind's `prose` plugin (if present) would add its own `::first-letter` reset and `blockquote` styles, overriding the custom `.drop-cap` and `.article-blockquote` classes.
**Why it happens:** The `@tailwindcss/typography` plugin is not installed in this project, so `prose` only applies the built-in Tailwind v4 prose utilities (which are more limited). However, any remaining `prose-p:` or `prose-headings:` modifiers on the `<article>` element should be audited for conflicts with the new paragraph map.
**How to avoid:** Remove the `prose` class from `<article>` when switching to custom paragraph rendering. Apply any needed base typography directly on `<p>` elements (`font-body text-ink leading-relaxed`).

### Pitfall 5: Blockquote Convention Mismatch
**What goes wrong:** AI-generated article content may never use `>` or `"` paragraph prefixes, meaning ARTC-02 is technically implemented but never visually triggered.
**Why it happens:** The AI rewriter (`src/lib/ingestion/`) does not produce structured blockquotes — it outputs prose paragraphs.
**How to avoid:** The requirement says "Blockquotes in article bodies render with large serif italic typography." This is a styling requirement — if no blockquotes exist in current content, the styling is still implemented correctly. The planner should note that this is a forward-looking feature: it applies when blockquotes appear (e.g., quoted speech in future content). The `>` prefix convention should be documented but is not required to be retroactively applied to existing articles.

---

## Code Examples

### Verified: Tailwind v4 `first-letter:` Variant
```
Source: tailwindcss/dist/lib.js (verified 2026-04-01)
Maps: "first-letter" → ["&::first-letter"]
```
Usage:
```html
<p class="first-letter:float-left first-letter:text-7xl first-letter:font-headline first-letter:leading-none first-letter:mr-1">
  Article text here...
</p>
```

### Verified: CSS Custom Property Usage in globals.css
```css
/* Source: src/app/globals.css (verified 2026-04-01) */
/* Established pattern — all tokens available as var(--color-*) */
--color-ink:       #071806;
--color-parchment: #FCF9EF;
--font-headline:   var(--font-newsreader), serif;
--spacing-gutter:  1rem;
--spacing-vertical: 1.7rem;
```

### Verified: HeroArticle Overlay Pattern (existing codebase)
```tsx
// Source: src/components/reader/HeroArticle.tsx (verified 2026-04-01)
// Proven overlay + gradient approach — replicate for Archival Header
<Link href={href} className="relative block rounded-sm overflow-hidden min-h-[60vh]">
  <img className="absolute inset-0 w-full h-full object-cover img-matte" ... />
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
  <div className="relative z-10 flex flex-col justify-end min-h-[60vh] p-[var(--spacing-gutter)] pb-8">
    {/* content */}
  </div>
</Link>
```

### Verified: ShareButton (existing, reusable)
```tsx
// Source: src/components/reader/ShareButton.tsx (verified 2026-04-01)
// Already uses Archivist tokens — no restyling needed for sidebar
<button className="inline-flex items-center gap-2 rounded-sm bg-surface-elevated text-slate shadow-sm px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
  <span className="material-symbols-rounded text-base">share</span>
  {copied ? "Link kopiert!" : "Teilen"}
</button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `initial-letter` CSS | Float-based `::first-letter` | Phase 36 decision | Firefox-safe cross-browser drop cap |
| `@tailwindcss/typography` | Native Tailwind v4 `first-letter:` variant + custom CSS classes | Phase 36 decision | No plugin dependency, Tailwind v4 compatible |
| Single-column article layout | Two-column grid with sidebar on desktop | Phase 36 | Desktop reading UX significantly improved |
| Title below hero image | Title overlapping hero image (Archival Header) | Phase 36 | Premium print-magazine aesthetic |

**Deprecated/outdated:**
- `prose` class on the article body `<article>` element: The current page uses `className="prose max-w-none mb-6 prose-p:text-text prose-headings:font-headline prose-a:text-primary prose-a:underline"`. With custom paragraph rendering, this class should be removed and base styles applied directly.
- `bg-background` token: Was used in Phase 33 and has since been replaced — use `bg-parchment` as the article page background.

---

## Open Questions

1. **Blockquote trigger convention**
   - What we know: Article content is plain `String?` — no structured markup
   - What's unclear: Does any current AI-generated content use a `>` prefix or similar convention?
   - Recommendation: Implement the `>` prefix detection and style the blockquote; document the convention in a code comment. Do not attempt to retroactively update existing articles.

2. **Sidebar metadata: author attribution**
   - What we know: The Article model has `source` (enum: OTS_AT | RSS | MANUAL) and `sourceFk` (relation to Source). There is no `author` string field.
   - What's unclear: ARTC-03 says "author/source attribution" — for AI-generated articles, who is "the author"?
   - Recommendation: Display the config `publisherName` ("Wurzelwelt") as author for MANUAL/AI articles, and the `sourceLabel` ("Quelle: OTS.at" / "Quelle: RSS") for ingested articles. No schema change needed.

3. **Drop cap and right-to-left or short paragraphs**
   - What we know: All content is German (LTR)
   - What's unclear: If the first paragraph is only one sentence, the float cap may overflow visually
   - Recommendation: Add `overflow-hidden` or `display: flow-root` to the first paragraph to contain the float. Document this as a CSS float-containment pattern.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/app/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARTC-01 | `estimateReadingTime(content)` returns correct minute count | unit | `npx vitest run src/app/__tests__/article-detail.test.ts -t "reading time"` | ❌ Wave 0 |
| ARTC-02 | Blockquote detection: paragraph starting with `>` classified as blockquote | unit | `npx vitest run src/app/__tests__/article-detail.test.ts -t "blockquote"` | ❌ Wave 0 |
| ARTC-03 | Article page renders sidebar metadata (source label, reading time) | manual-only | Visual inspection — no DOM test infrastructure for Server Components in this codebase | n/a |
| ARTC-04 | Archival Header renders with image overlay | manual-only | Visual inspection — CSS overlay position cannot be unit tested meaningfully | n/a |

**Note on ARTC-03 and ARTC-04 manual-only:** The project's Vitest setup uses a Node environment with pgLite (no jsdom, no React Testing Library). DOM/visual assertions for CSS layout are not feasible in the current test setup. These requirements are verified by visual inspection during `/gsd:verify-work`.

### Sampling Rate
- **Per task commit:** `npx vitest run src/app/__tests__/article-detail.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/__tests__/article-detail.test.ts` — covers ARTC-01 (reading time util), ARTC-02 (blockquote detection logic)

---

## Sources

### Primary (HIGH confidence)
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` — current article page implementation (verified 2026-04-01)
- `src/app/globals.css` — complete Archivist token set (verified 2026-04-01)
- `src/components/reader/HeroArticle.tsx` — proven overlay/gradient pattern (verified 2026-04-01)
- `src/components/reader/ShareButton.tsx` — existing share component (verified 2026-04-01)
- `src/components/reader/WurzelAppBar.tsx` — sticky header height = 60px (verified 2026-04-01)
- `prisma/schema.prisma` — Article model fields (verified 2026-04-01)
- `node_modules/tailwindcss/dist/lib.js` — `first-letter:` variant confirmed (verified 2026-04-01)
- `package.json` — Next.js 15.5.14, Tailwind 4.2.2, React 19.2.4 (verified 2026-04-01)
- `.planning/REQUIREMENTS.md` — `initial-letter` and `@tailwindcss/typography` explicitly out of scope (verified 2026-04-01)

### Secondary (MEDIUM confidence)
- Float-based drop cap cross-browser technique: widely documented CSS pattern; consistent with MDN `float` + `::first-letter` documentation

### Tertiary (LOW confidence)
- 200 wpm reading speed estimate: industry standard editorial figure used by Medium, Substack, etc. — not verified against a formal source for this research

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified against installed versions
- Architecture: HIGH — patterns derived directly from existing codebase components
- Pitfalls: HIGH — derived from CSS specification behavior and existing codebase constraints
- Blockquote convention: LOW — AI content generation behavior not audited; convention is a reasonable default

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable tech stack — 30-day window)
