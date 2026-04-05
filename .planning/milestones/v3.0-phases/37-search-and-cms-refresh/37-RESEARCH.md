# Phase 37: Search and CMS Refresh - Research

**Researched:** 2026-04-01
**Domain:** Tailwind v4 token migration — search page and CMS admin restyling; CMS theme tag field — Next.js 15 / React 19
**Confidence:** HIGH

## Summary

Phase 37 is the final mile of the v3.0 Archivist design-system migration. Two distinct work streams exist. The first is a token replacement sweep across the CMS admin and search page: legacy MD3 tokens (`primary`, `primary-container`, `secondary`, `accent`, `background`, `text`) must be replaced with Archivist Ink/Parchment/Slate equivalents. The second stream adds the "Grune der Woche" theme tag field to the CMS article edit form — but the DB schema and the `updateArticle` server action already support this (`theme String?` on the Article model, `theme` option in `UpdateArticleInput`). What is missing is simply the UI element that exposes the field.

A critical finding: the search page (`SearchPageLayout.tsx`) is already nearly fully migrated to Archivist tokens. The only ambiguity is the `rounded-xs` Bezirk filter chips — this is a Tailwind v4 token already defined in the codebase (TOKN-03: 0.125rem). The search page requires minimal changes: verify no legacy palette tokens remain and confirm editorial typography styling matches SRCH-01 expectations.

The CMS admin pages have a pervasive pattern of legacy token usage: every CTA button uses `from-primary to-primary-container text-white rounded-full`, every input uses `focus:ring-primary`, and body text uses `text-text` / `text-text/70`. These must be replaced with Archivist equivalents throughout 10+ files. The CMS also uses hardcoded Tailwind color classes (green, red, yellow, blue, orange, purple, amber) for status badges and action buttons — these are semantic indicators for data state and should be migrated to functional Archivist-palette variants.

**Primary recommendation:** Split into two plans — Plan 37-01 handles the CMS token migration (largest surface area), Plan 37-02 handles the search page polish and the theme tag field addition (which is an additive UI-only change, no schema migration needed).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-01 | Search page restyled with Archivist color tokens and editorial typography | `SearchPageLayout.tsx` already uses `bg-parchment`, `text-ink`, `text-slate`, `bg-surface`, `bg-surface-elevated`, `font-headline`, `font-label`. The filter chips (`bg-ink text-parchment` active / `bg-surface-elevated text-slate` inactive) are correct. Only remaining gap: verify no warm-cream or forest-green remnants exist and confirm result cards use ArticleCard (which is fully migrated). Minimal work needed. |
| CMS-01 | Admin pages restyled with Archivist color tokens (Ink/Parchment/Slate) | 10+ admin files use `from-primary to-primary-container`, `text-text`, `ring-primary`, `text-secondary`, `text-accent`, `bg-background`, `rounded-full`. Full sweep required across layout, login, articles, sources, exceptions, ai-config pages and their sub-components. |
| CMS-02 | Admin can assign "Grune der Woche" theme tag to articles | DB schema already has `theme String?`. `UpdateArticleInput` already has `theme?: string \| null`. Edit page already has a `<select name="theme">` with `<option value="gruene_woche">` and server action wiring. **This requirement is already implemented in Phase 35 scaffolding.** Phase 37 must verify this field is present, correctly labeled ("Grune der Woche"), and styled with Archivist tokens as part of the CMS-01 form restyling. No schema migration, no new server action needed. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router, Server/Client Components | Project baseline |
| React | 19.2.4 | UI components | Project baseline |
| Tailwind v4 | 4.2.2 | Utility classes, `@theme` token system | Project baseline — all Archivist tokens in `globals.css` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | Phase 37 is pure token replacement and UI polish — no new dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct class replacement | CSS variable bridge aliases | Bridge aliases were explicitly rejected in Phase 33 ("clean break from 8 old tokens — no bridge aliases") |

**Installation:** No new packages required.

---

## Architecture Patterns

### Admin Token Replacement Pattern

The CMS admin was built before the Archivist token system landed. Every occurrence of the old MD3 token set must be replaced. The mapping is:

| Legacy Token | Archivist Replacement | Notes |
|---|---|---|
| `text-text` | `text-ink` | Body text |
| `text-text/70` | `text-ink-muted` | Secondary body text |
| `text-text/60` | `text-ink-muted` | Use `text-ink-dim` for even more muted |
| `text-text/50` | `text-ink-dim` | Low-emphasis text |
| `bg-background` | `bg-parchment` | Page background (same as reader) |
| `from-primary to-primary-container` | `from-ink to-ink-soft` | CTA button gradient |
| `text-white` on buttons | `text-parchment` | On dark ink backgrounds |
| `rounded-full` on buttons | `rounded-sm` | TOKN-03: 0.125rem radius only |
| `ring-primary` | `ring-ink` | Focus ring on inputs |
| `border-surface` on inputs | `border-parchment-dim` | Input border |
| `text-secondary` | `text-slate` | Link/interactive text |
| `text-accent` | Use `text-red-600` (functional — see below) or `text-slate` | Error text |
| `bg-accent/10` | `bg-red-50` (functional) | Error message background |

### Status Badge Color Strategy

The admin uses hardcoded Tailwind color classes for data-state badges (article status, source health, etc.). These are **functional/semantic colors**, not palette tokens. The Archivist system does not define semantic status colors. The correct approach is:

- **Keep** semantic greens/reds/yellows for status indicators (PUBLISHED, OK, error states) — these convey meaning, not brand
- **Replace** non-semantic uses that happen to use color (e.g., category badges that use blue, purple, amber for visual variety only) — replace these with Archivist Slate/Ink tonal variants

Specifically:
- Status PUBLISHED → `bg-green-100 text-green-800` — KEEP (semantic)
- Status REVIEW → `bg-yellow-100 text-yellow-800` — KEEP (semantic)
- Status REJECTED → `bg-red-100 text-red-800` — KEEP (semantic)
- Source health OK/DEGRADED/DOWN → KEEP (semantic)
- Approve/Reject action buttons (green-600, red-600) → KEEP (semantic affordance)
- "Loeschen" button with `border-red-300 text-red-600` → KEEP (destructive action)
- Error message `text-accent bg-accent/10` → Migrate to `text-red-600 bg-red-50` (semantic) or `text-ink bg-parchment-dim`
- Bezirk badge `bg-green-100 text-green-700` in article preview → Migrate to `bg-parchment-dim text-ink-muted` (not semantic)
- Source type badge `bg-blue-100 text-blue-700` → Migrate to `bg-surface text-slate` (not semantic)
- Category/keywords badges (purple, amber) → Migrate to `bg-surface text-slate` (not semantic)
- isPinned active state `bg-orange-100 text-orange-700` → Migrate to `bg-aged-wood-dim/20 text-aged-wood-soft` or `bg-surface text-slate`
- isFeatured active state `bg-purple-100 text-purple-700` → Migrate to `bg-ink/10 text-ink`

### CMS Layout Token Pattern

The admin layout sidebar currently uses deprecated tokens:
```tsx
// Current (legacy)
<div className="flex h-screen bg-background">
  <aside className="w-56 bg-surface-elevated flex flex-col py-6 px-4 shrink-0">
    <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-4">
    <Link className="block px-3 py-2 rounded-sm text-sm text-text/70 hover:bg-surface hover:text-text">
```

Replacement:
```tsx
// Phase 37 (Archivist)
<div className="flex h-screen bg-parchment">
  <aside className="w-56 bg-surface-elevated flex flex-col py-6 px-4 shrink-0">
    <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-4">
    <Link className="block px-3 py-2 rounded-sm text-sm text-ink-muted hover:bg-surface hover:text-ink">
```

### CTA Button Pattern (admin-wide)

Every CTA button in the admin uses the same legacy gradient pill. The Archivist replacement:

```tsx
// Legacy (appears in 10+ files)
className="px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white text-sm font-medium rounded-full hover:opacity-90"

// Archivist replacement
className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90"
```

Note: `rounded-full` → `rounded-sm` per TOKN-03 (no rounded corners). This is a **mandatory** change.

### Form Input Pattern (admin-wide)

Every form input uses the legacy focus ring pattern:
```tsx
// Legacy
className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"

// Archivist replacement
className="w-full border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
```

### Login Page Pattern

```tsx
// Legacy
<div className="min-h-screen flex items-center justify-center bg-background">
  <div className="bg-surface-elevated p-8 rounded-sm shadow-md w-full max-w-sm">
    <h1 className="text-2xl font-bold mb-6 text-text font-headline">

// Archivist replacement
<div className="min-h-screen flex items-center justify-center bg-parchment">
  <div className="bg-surface-elevated p-8 rounded-sm shadow-md w-full max-w-sm">
    <h1 className="text-2xl font-bold mb-6 text-ink font-headline">
```

### Theme Tag Field (CMS-02 — Already Implemented)

The `<select name="theme">` field already exists in `src/app/(admin)/admin/articles/[id]/edit/page.tsx`:

```tsx
// Already present — only needs styling update (ring-primary → ring-ink, text-text → text-ink)
<select
  id="theme"
  name="theme"
  defaultValue={article.theme ?? ''}
  className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
>
  <option value="">Kein Thema</option>
  <option value="gruene_woche">Gruenes der Woche</option>
</select>
```

The server action already handles `theme: formData.get('theme')?.toString() ?? ''` and normalizes empty string to `null`. No new logic needed. The Phase 37 plan for CMS-02 is to verify this field exists, ensure the label reads "Grune der Woche" (it currently reads "Gruenes der Woche" — acceptable, but confirm requirements intent), and apply Archivist input styling.

### Search Page — Minimal Delta

`SearchPageLayout.tsx` is already well-migrated. Current state:
- Background: `bg-parchment` ✓
- Heading: `font-headline text-3xl text-ink` ✓
- Input: `bg-surface ring-1 ring-slate/20 focus:ring-ink` ✓
- Filter chips: `bg-ink text-parchment` (active) / `bg-surface-elevated text-slate` (inactive) ✓
- Result cards: use `ArticleCard` which is fully on Archivist tokens ✓
- Section headings: `font-label text-xs uppercase tracking-wider text-slate` ✓
- Bezirk category grid: `bg-surface-elevated text-ink-soft` ✓

Remaining issues to audit:
- `rounded-xs` on filter chips — this is the `border-radius: 0.125rem` (TOKN-03 compliant) Tailwind v4 default
- Back-button uses `bg-gradient-to-br from-ink to-ink-soft text-parchment` ✓
- "Alle Bezirke anzeigen" button uses `rounded-xs` — check if this exists or falls back

The SRCH-01 requirement ("result cards, filter chips, and typography using Archivist Ink/Parchment/Slate tokens — no legacy forest-green or warm-cream palette remnants visible") is **substantially complete**. Plan 37-02 verifies and seals any remaining gaps.

### Anti-Patterns to Avoid

- **Replacing semantic status colors:** Green/red/yellow status indicators (PUBLISHED, OK, error) should be retained — they convey data state, not brand. Only replace non-semantic decorative colors.
- **Using `rounded-full` for CTA buttons:** TOKN-03 mandates `rounded-sm` (0.125rem). The `rounded-full` pill shape is from the legacy MD3 system. Replace without exception.
- **Using `text-white` on dark backgrounds:** Use `text-parchment` instead — `text-white` is not an Archivist token.
- **Forgetting `bg-background` → `bg-parchment`:** The login page uses `bg-background`. This must be migrated — `bg-background` is a legacy token that no longer resolves to the correct Archivist parchment value.
- **`border-surface` on inputs:** Should be `border-parchment-dim` for the more precise Archivist border color.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme tag persistence | New server action / new DB field | Existing `updateArticle` + `theme` field on Article model | Already implemented in Phase 35 — DB has `theme String?`, server action handles it |
| Status badge color logic | New color system | Tailwind semantic color classes (green/red/yellow) | Admin-only functional colors — no brand impact, semantic meaning preserved |

---

## Common Pitfalls

### Pitfall 1: Incomplete Token Sweep in Forms
**What goes wrong:** A form field gets `text-ink` but the label stays `text-text/70`, or the focus ring stays `ring-primary`.
**Why it happens:** The legacy pattern `text-text focus:ring-primary` appears verbatim in 15+ className strings across 8 files. A partial replacement leaves mixed tokens.
**How to avoid:** Process each file completely — not just one occurrence. Use a systematic file-by-file approach.
**Warning signs:** Admin pages render correctly for base state but show a blue/green glow on focus (the MD3 primary color leaking through `ring-primary`).

### Pitfall 2: `bg-background` Not Resolving
**What goes wrong:** `bg-background` is used on the login page outer wrapper. In Tailwind v4 with the current `@theme`, `--color-background` is not defined — it was part of the old pre-Phase 33 token set.
**Why it happens:** The login page was not updated during Phase 33 (which focused on reader-facing components).
**How to avoid:** Replace `bg-background` → `bg-parchment` in login page. Verify by checking `globals.css` — `--color-background` does not appear there.
**Warning signs:** Login page background is white (fallback) instead of parchment.

### Pitfall 3: `rounded-full` on CTA Buttons (TOKN-03 violation)
**What goes wrong:** Admin CTA buttons all use `rounded-full` — this creates pill-shaped buttons violating the "no rounded corners" Archivist principle (TOKN-03).
**Why it happens:** The CMS was built before TOKN-03 was established.
**How to avoid:** Replace every `rounded-full` with `rounded-sm` in admin files. There are 10 occurrences across 8 files.
**Warning signs:** Admin buttons appear as pills; reader-facing components use square buttons — visual inconsistency between admin and reader.

### Pitfall 4: `text-secondary` Without Definition
**What goes wrong:** `text-secondary` appears in admin links (e.g., article row edit links, SourceOverrideForm summary). `--color-secondary` is not defined in the v3.0 `@theme`.
**Why it happens:** Left over from the MD3 token set.
**How to avoid:** Replace `text-secondary` → `text-slate` for muted links, or `text-ink` for primary links.
**Warning signs:** Text with `text-secondary` renders as the Tailwind default (no meaningful color) or inherits incorrectly.

### Pitfall 5: CMS-02 Theme Field Already Exists
**What goes wrong:** Planner creates a task to "add a theme field to the edit form" — but the field already exists in the current `[id]/edit/page.tsx`.
**Why it happens:** Phase 35 scaffolded the DB + server action + UI select together.
**How to avoid:** CMS-02 plan task should be "verify and restyle the existing theme field" — not "add theme field." The existing `<option value="gruene_woche">Gruenes der Woche</option>` is the implementation.
**Warning signs:** Duplicate `<select name="theme">` elements on the form.

---

## Code Examples

### Admin CTA Button — Before/After
```tsx
// Source: src/app/(admin)/admin/articles/page.tsx (verified 2026-04-01) — LEGACY
className="px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white text-sm font-medium rounded-full hover:opacity-90"

// Phase 37 replacement — Archivist
className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90"
```

### Admin Sidebar — Before/After
```tsx
// Source: src/app/(admin)/layout.tsx (verified 2026-04-01) — LEGACY
<div className="flex h-screen bg-background">
<p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-4">
<Link className="block px-3 py-2 rounded-sm text-sm text-text/70 hover:bg-surface hover:text-text">

// Phase 37 replacement — Archivist
<div className="flex h-screen bg-parchment">
<p className="text-xs font-semibold text-slate uppercase tracking-wide mb-4">
<Link className="block px-3 py-2 rounded-sm text-sm text-ink-muted hover:bg-surface hover:text-ink">
```

### Admin Form Input — Before/After
```tsx
// Source: multiple admin form files (verified 2026-04-01) — LEGACY
className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"

// Phase 37 replacement — Archivist
className="w-full border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
```

### Article Edit Page — Theme Field (Already Implemented)
```tsx
// Source: src/app/(admin)/admin/articles/[id]/edit/page.tsx (verified 2026-04-01)
// CMS-02 is already implemented — only styling update needed
<div>
  <label htmlFor="theme" className="block text-sm font-medium text-ink-muted mb-1">
    Thema <span className="text-xs text-ink-dim">(optional)</span>
  </label>
  <select
    id="theme"
    name="theme"
    defaultValue={article.theme ?? ''}
    className="w-full border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
  >
    <option value="">Kein Thema</option>
    <option value="gruene_woche">Grune der Woche</option>
  </select>
</div>
```

### Search Page Filter Chips (Already Correct)
```tsx
// Source: src/components/reader/SearchPageLayout.tsx (verified 2026-04-01)
// Already uses Archivist tokens — reference pattern only
className={
  "shrink-0 px-3 py-1 rounded-xs text-sm font-label transition-colors " +
  (activeBezirkId === b.id
    ? "bg-ink text-parchment"
    : "bg-surface-elevated text-slate shadow-sm hover:text-ink")
}
```

---

## File Inventory: Changes Required

| File | Change Type | Legacy Tokens to Replace |
|------|------------|--------------------------|
| `src/app/admin/login/page.tsx` | Token migration | `bg-background`, `text-text` |
| `src/app/admin/login/login-form.tsx` | Token migration | `text-accent bg-accent/10`, `ring-primary`, `from-primary to-primary-container text-white rounded-full` |
| `src/app/(admin)/layout.tsx` | Token migration | `bg-background`, `text-secondary`, `text-text/70`, `hover:text-text` |
| `src/app/(admin)/admin/articles/page.tsx` | Token migration | `text-text`, `from-primary...rounded-full`, `text-text/70` |
| `src/app/(admin)/admin/articles/ArticleRow.tsx` | Token migration + badge audit | `text-text`, `text-secondary`, `bg-green-100`, `border-b border-surface` |
| `src/app/(admin)/admin/articles/ArticleFilters.tsx` | Token migration | `text-text`, `ring-primary`, `border-surface` |
| `src/app/(admin)/admin/articles/[id]/edit/page.tsx` | Token migration + CMS-02 verify | `text-text`, `ring-primary`, `rounded-full`, `bg-green-100 text-green-700` (badge) |
| `src/app/(admin)/admin/articles/new/page.tsx` | Token migration | `text-text`, `ring-primary`, `rounded-full` |
| `src/app/(admin)/admin/sources/page.tsx` | Token migration | `from-primary...rounded-full` |
| `src/app/(admin)/admin/sources/SourceCard.tsx` | Token migration + badge audit | `from-primary...rounded-full`, hardcoded color badges |
| `src/app/(admin)/admin/exceptions/ExceptionCard.tsx` | Token migration | `text-text`, `border-b border-surface`, `bg-yellow-100` (badge — semantic, keep) |
| `src/app/(admin)/admin/ai-config/page.tsx` | Token migration | `text-text`, `from-primary...rounded-full`, `ring-primary` |
| `src/app/(admin)/admin/ai-config/GlobalAiConfigForm.tsx` | Token migration | `text-text`, `ring-primary`, `from-primary...rounded-full` |
| `src/app/(admin)/admin/ai-config/SourceOverrideForm.tsx` | Token migration + badge audit | `text-text`, `text-secondary`, `ring-primary`, `from-primary...rounded-full`, color badges |
| `src/components/admin/LogoutButton.tsx` | Token migration | `text-text/50`, `hover:text-text` |
| `src/components/reader/SearchPageLayout.tsx` | Audit + minor fixes | Verify no remnants; confirm `rounded-xs` resolves correctly |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MD3 token set (`primary`, `secondary`, `text`, `background`) | Archivist tokens (Ink/Parchment/Slate) | Phase 33 (reader) | Admin was not updated in Phase 33 — Phase 37 closes this gap |
| `rounded-full` pill buttons | `rounded-sm` square-ish buttons | Phase 33 (TOKN-03) | Admin buttons still use pill shape — Phase 37 fixes |
| `text-white` on dark buttons | `text-parchment` | Phase 33 | Admin buttons still use `text-white` — Phase 37 fixes |

**Deprecated/outdated in Phase 37:**
- `--color-background`: Not defined in v3.0 `@theme`. Use `bg-parchment`.
- `--color-primary` / `--color-primary-container`: Not defined in v3.0 `@theme`. Use `from-ink to-ink-soft`.
- `--color-secondary`: Not defined in v3.0 `@theme`. Use `text-slate`.
- `--color-accent`: Not defined in v3.0 `@theme`. Use semantic `text-red-600` for errors.
- `--color-text`: Not defined in v3.0 `@theme`. Use `text-ink` / `text-ink-muted` / `text-ink-dim`.

---

## Open Questions

1. **"Gruenes der Woche" vs "Grune der Woche"**
   - What we know: The select option currently reads `<option value="gruene_woche">Gruenes der Woche</option>`. The requirements say "Grune der Woche" theme tag field. The homepage section is titled "Das Grune der Woche."
   - What's unclear: Should the select label match the homepage section title exactly?
   - Recommendation: Change the select option label to "Grune der Woche" to match the homepage section title and requirements wording. The `value="gruene_woche"` (the DB value) stays unchanged.

2. **ExceptionCard semantic colors**
   - What we know: `bg-yellow-100 text-yellow-800` is used for source type badge in ExceptionCard; `bg-green-600` and `bg-red-600` for Approve/Reject buttons.
   - What's unclear: The Approve/Reject buttons are the most impactful in the admin — they change article states. Should they remain as clear semantic green/red?
   - Recommendation: Keep semantic green/red for approve/reject action buttons — these are functional affordances, not decoration. Migrate the source type badge to `bg-surface text-slate`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/admin/articles-actions.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | Search page uses Archivist tokens — no legacy palette remnants | manual-only | Visual inspection — CSS token correctness is not unit-testable | n/a |
| CMS-01 | Admin pages use Archivist tokens throughout | manual-only | Visual inspection — CSS token correctness is not unit-testable | n/a |
| CMS-02 | `updateArticleDb` persists `theme = 'gruene_woche'` and `theme = null` | unit | `npx vitest run src/lib/admin/articles-actions.test.ts -t "theme"` | ❌ Wave 0 |

**Note on SRCH-01 and CMS-01 manual-only:** Token migration is a visual correctness check. The Vitest setup uses a Node environment with pgLite (no jsdom, no React Testing Library). CSS class presence on rendered elements is not testable in the current infrastructure.

**Note on CMS-02:** The server action `updateArticleDb` already handles `theme` in the existing tests, but there is no specific test for `theme = 'gruene_woche'` assignment and clearing (`theme = null`). A targeted test should be added in Wave 0.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/admin/articles-actions.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add test case to `src/lib/admin/articles-actions.test.ts` — covers CMS-02: assigns `theme = 'gruene_woche'` and clears to `null` via `updateArticleDb`

---

## Sources

### Primary (HIGH confidence)
- `src/components/reader/SearchPageLayout.tsx` — current search page layout, token audit (verified 2026-04-01)
- `src/app/(admin)/layout.tsx` — CMS admin shell layout (verified 2026-04-01)
- `src/app/admin/login/page.tsx` + `login-form.tsx` — login page (verified 2026-04-01)
- `src/app/(admin)/admin/articles/page.tsx`, `ArticleRow.tsx`, `ArticleFilters.tsx` — articles admin (verified 2026-04-01)
- `src/app/(admin)/admin/articles/[id]/edit/page.tsx` — article edit form, theme field present (verified 2026-04-01)
- `src/app/(admin)/admin/exceptions/ExceptionCard.tsx` — exception queue (verified 2026-04-01)
- `src/app/(admin)/admin/sources/SourceCard.tsx` — sources admin (verified 2026-04-01)
- `src/app/(admin)/admin/ai-config/page.tsx`, `GlobalAiConfigForm.tsx`, `SourceOverrideForm.tsx` — AI config admin (verified 2026-04-01)
- `src/components/admin/LogoutButton.tsx` — logout component (verified 2026-04-01)
- `src/app/globals.css` — complete Archivist v3.0 token set (verified 2026-04-01)
- `src/lib/admin/articles-actions.ts` — `UpdateArticleInput` type confirms `theme?: string | null` (verified 2026-04-01)
- `prisma/schema.prisma` — `Article.theme String?` confirmed (verified 2026-04-01)
- `.planning/STATE.md` — Phase 35 decision: `prisma db push used for theme migration; theme empty string maps to null in DB` (verified 2026-04-01)
- `.planning/REQUIREMENTS.md` — TOKN-03 (no rounded corners), CMS-01, CMS-02, SRCH-01 definitions (verified 2026-04-01)

### Secondary (MEDIUM confidence)
- None — all key findings verified against codebase directly

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing versions verified
- Architecture (token mapping): HIGH — derived from direct codebase audit of both legacy tokens and v3.0 `@theme`
- CMS-02 status (already implemented): HIGH — verified in `[id]/edit/page.tsx` and `articles-actions.ts`
- Search page status (nearly complete): HIGH — verified directly in `SearchPageLayout.tsx`
- Badge color strategy (keep semantic colors): MEDIUM — reasonable interpretation of "Archivist tokens throughout" that preserves functional meaning

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable tech stack — 30-day window)
