# Pitfalls Research

**Domain:** Adding "The Modern Archivist" design system overhaul to existing Next.js 15 / Tailwind v4 regional news platform
**Milestone:** v3.0 The Modern Archivist
**Researched:** 2026-03-30
**Confidence:** HIGH for browser/CSS pitfalls (official sources + MDN + caniuse); MEDIUM for Tailwind v4 token naming (verified via Tailwind official docs + GitHub issues); MEDIUM for Open-Meteo (official docs + GitHub issues)

---

## Critical Pitfalls

### Pitfall 1: Token Naming Collision — MD3 Semantic Names vs Existing Tailwind v4 @theme Utilities

**What goes wrong:**
The existing `globals.css` already defines `--color-surface`, `--color-primary`, `--color-secondary` in `@theme`. Adding MD3-style tokens (`--color-ink`, `--color-parchment`, `--color-on-surface`, `--color-surface-variant`) that partially overlap with existing names causes two failure modes:

1. **Silent overwrite:** A new token named `--color-surface` silently replaces the existing one. Every component using `bg-surface`, `text-surface` etc. changes color without any error. This is especially dangerous for the CMS admin which must retain its brand styling.
2. **Unused orphan:** Renaming `--color-surface` to `--color-parchment` without a migration pass leaves dozens of `bg-surface` utility classes in components pointing at a CSS variable that no longer exists in `@theme`. Tailwind silently generates no utility — the class becomes a no-op with no build error.

**Why it happens:**
Tailwind v4's `@theme` is a pure CSS token-to-utility generator. There is no schema validation, no deprecation warning, and no "unused token" output. A developer adds the new MD3-style block, removes the old tokens, runs `next dev`, and sees the homepage — which is fine because the hero image covers most of it. The regression is only visible in secondary views like the CMS or Bezirk pages.

**How to avoid:**
1. Adopt a **two-phase rename** strategy: in Phase 1, add all new tokens as aliases alongside old ones (e.g., `--color-parchment: #FCF9EF` added next to `--color-background: #FCF9EF`). Both utilities exist simultaneously.
2. In Phase 2, do a codebase-wide search-and-replace of utility classes (`bg-background` → `bg-parchment`).
3. Only in Phase 3, remove the old token definitions.
4. Use `grep -r "bg-background\|text-background\|border-background" src/` to confirm zero remaining usages before removing old tokens.

**Warning signs:**
- CMS admin pages render with incorrect colors after token migration (forest-green `--color-primary` overwritten by ink black `--color-ink`)
- `bg-surface` stops applying any background color (Tailwind generates no utility for a removed token — it becomes an unknown class, silently ignored)
- Any component that used `border-primary` now uses the new ink color (dark) instead of forest green

**Phase to address:**
Phase 1 (Color System Foundation) — token migration must be the first task, executed atomically with a full component audit before any new components are built on top.

---

### Pitfall 2: backdrop-blur Does Not Work in Safari Without -webkit- Prefix and Requires a Semi-Transparent Background

**What goes wrong:**
The glassmorphic bottom nav uses `backdrop-blur`. Two distinct failures occur on iOS Safari:

1. **Complete invisibility of the blur:** Without `-webkit-backdrop-filter` alongside the standard `backdrop-filter`, the blur simply does not render in older Safari versions (pre-iOS 18). The nav appears with a flat, fully transparent background instead of the frosted glass effect.
2. **Blur collapses when background is fully transparent:** Safari requires the element to have at least a partially opaque background color (e.g., `rgba(255,255,255,0.6)`). `background: transparent` combined with `backdrop-filter` renders as if neither property is set — the nav becomes invisible against scrolling content.

A third issue: when a parent element also has `backdrop-filter` applied (e.g., a toast or floating card above the nav), Safari treats the nested element's blur as composited differently, producing visible rendering artifacts and sometimes showing a hard-edged rectangle around the blur region.

**Why it happens:**
This is a documented long-standing WebKit bug. The `-webkit-backdrop-filter` vendor prefix is mandatory for pre-iOS 18 Safari (still a significant share of Austrian mobile users). The transparent-background requirement is a compositing constraint in WebKit's rendering model — without an opaque region to composite against, the blur has no source pixels to sample.

**How to avoid:**
Always pair `backdrop-filter` with `-webkit-backdrop-filter` in CSS (Tailwind's `backdrop-blur-*` utilities do not automatically add the -webkit- prefix in v4 — verify this). Apply at minimum `bg-white/60` or equivalent semi-transparent background on the same element. Test on an actual iPhone (simulator does not always reproduce this). Avoid nesting backdrop-filter elements.

In Tailwind v4 the correct pattern is:
```css
/* In a @layer or component CSS */
.glass-nav {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background-color: rgba(252, 249, 239, 0.75); /* --color-background at 75% */
}
```

**Warning signs:**
- Bottom nav is invisible or shows flat color on iPhone (any iOS version)
- Bottom nav shows a hard rectangle artifact at its boundaries on Safari
- Blur effect visible in Chrome/Firefox but absent on Safari in BrowserStack

**Phase to address:**
Phase implementing the glassmorphic bottom nav — Safari must be tested on a physical device before the phase is marked complete.

---

### Pitfall 3: backdrop-blur Causes Scroll Jank on Mid-Range Android Devices

**What goes wrong:**
A fixed-position bottom nav with `backdrop-blur` triggers a new GPU compositing layer for every scroll frame. On mid-range Android devices (which represent a realistic share of Austrian regional news readers), this causes visible frame drops (below 30fps) during scroll, making the site feel broken. The performance cost scales with blur radius — `blur(20px)` on a 390px-wide nav is significantly more expensive than `blur(4px)`.

**Why it happens:**
`backdrop-filter` forces GPU compositing and requires the browser to sample the pixels behind the element on every paint. A fixed-position element that covers the full width participates in every scroll repaint. At large blur radii, this is expensive enough to drop below 60fps on GPUs without hardware acceleration.

**How to avoid:**
- Keep the blur radius at or below `blur(12px)` — above this, the visual gain is marginal but the cost increases significantly.
- Add `will-change: transform` to the nav element to ensure it is isolated to its own composite layer (reduces the repaint area).
- Test scroll performance on a mid-range Android device (or throttle GPU in Chrome DevTools to "4x slowdown").
- As a fallback for low-end devices: use `@media (prefers-reduced-motion: reduce)` to disable the blur and fall back to a solid background.

**Warning signs:**
- Chrome DevTools Performance tab shows "Recalculate Style" and "Composite Layers" events on every scroll frame
- FPS counter drops below 45fps during scroll on Android
- Users report the site "feeling laggy" on the homepage (where the most content scrolls behind the nav)

**Phase to address:**
Phase implementing glassmorphic bottom nav — performance testing on Android must be a done condition.

---

### Pitfall 4: "No-Line Rule" Design Fails WCAG 1.4.11 Non-Text Contrast for Interactive Elements

**What goes wrong:**
WCAG Success Criterion 1.4.11 (Non-text Contrast, Level AA) requires that visual information used to identify UI components has at least a 3:1 contrast ratio against adjacent colors. When borders are removed from buttons, form fields, cards with interactive areas, and the region selector card, these components may fail to communicate "I am tappable" to low-vision users.

The specific failure mode: the glassmorphic nav and the "Frag den Wurzelmann" card use tonal backgrounds (warm cream variants) to indicate visual separation. If the contrast ratio between `--color-background` (#FCF9EF) and `--color-surface` (#F6F4EA) is below 3:1 — which it almost certainly is, since they are designed to be subtle — any interactive element relying solely on that background shift for its boundary fails WCAG 1.4.11.

**Why it happens:**
The "No-Line Rule" philosophy optimizes for visual elegance. But the editorial print-magazine aesthetic that works on paper (where slight tonal shifts are perceptible under controlled lighting) does not always translate to mobile screens viewed in sunlight or by low-vision users. The existing v2.0 design already uses tonal layering without borders — v3.0 extends this pattern further, compounding the risk.

**How to avoid:**
- Use the WebAIM Contrast Checker to verify that each interactive element in its resting state has its boundary discernible at 3:1 against its parent background.
- Use elevation (box-shadow without border) to communicate depth: `box-shadow: 0 1px 4px rgba(0,0,0,0.1)` adds perceivable separation without a visible border line.
- For nav tabs: the active state uses a top-border indicator. Ensure this indicator has sufficient contrast against the nav background (not just presence/absence of the line).
- For the region selector card: add a subtle `ring` or drop shadow instead of a border.

**Warning signs:**
- WebAIM contrast checker reports < 3:1 between a card background and its parent surface
- Interactive elements (buttons, nav tabs) look "flat" on a phone screen in direct sunlight
- Any accessibility audit tool flags "insufficient non-text contrast"

**Phase to address:**
Phase 1 (Color System Foundation) — token ratios must be validated at token definition time, before components are built.

---

### Pitfall 5: CSS initial-letter (Modern Drop Cap) Is Not Supported in Firefox

**What goes wrong:**
`initial-letter` is the modern CSS property for drop caps (specifying how many lines the first letter spans, with proper baseline alignment). It is supported in Chrome 110+ and Safari (with `-webkit-` prefix), but **Firefox does not support `initial-letter` as of 2026**. An article page using `initial-letter` renders correctly in Chrome and Safari, but in Firefox the first letter appears at normal size with no drop cap effect — or worse, if the fallback is not handled, the layout breaks because font-size and float calculations misfire.

**Why it happens:**
`initial-letter` is a modern CSS feature tracked in a Firefox open bug. It was not part of CSS 2.1 and Firefox has not yet implemented it. Developers test in Chrome, see it working, and ship without cross-browser validation.

**How to avoid:**
Use a progressive enhancement strategy:
```css
.article-body p:first-of-type::first-letter {
  /* Firefox fallback: float-based drop cap */
  float: left;
  font-size: 3.5rem;
  line-height: 0.8;
  margin-right: 0.1em;
  margin-top: 0.05em;
  font-family: var(--font-headline);
}

@supports (initial-letter: 3) {
  .article-body p:first-of-type::first-letter {
    float: none;
    initial-letter: 3;
    margin-right: 0.1em;
  }
}
```

Note: Firefox also applies the parent paragraph's `line-height` to the floated `::first-letter` (a separate Firefox bug since 2005 — open as of 2026), which means the float fallback needs a low explicit `line-height: 0.8` to prevent the drop cap from pushing the first line down.

Additionally, `::first-letter` does not work as expected when the first text node contains HTML elements — if an article begins with a `<strong>` or `<span>` wrapper, `::first-letter` will not target the first character. Ensure article body first paragraph is plain text.

**Warning signs:**
- Drop cap renders correctly in Chrome but absent or misaligned in Firefox
- First paragraph baseline shifts down in Firefox (line-height bug)
- Drop cap appears on a `<strong>` tag's first letter instead of the paragraph's first letter

**Phase to address:**
Phase implementing article detail redesign — Firefox must be part of the acceptance criteria.

---

### Pitfall 6: Editorial Serif Font (Newsreader) Causes CLS Without Proper next/font Configuration

**What goes wrong:**
Newsreader is already in the stack. However, if the font subsets or weights used in v3.0 differ from v2.0 (e.g., adding italic for drop cap styling or adding a heavier weight for blockquote attribution), the `next/font` configuration may not include those variants, causing them to fall back to `Times New Roman` on first load. The fallback font has different metrics than Newsreader, causing headline text to reflow when the web font loads — a measurable CLS event.

More critically: if drop cap CSS relies on Newsreader's cap height for vertical alignment, and the fallback renders at different metrics, the drop cap can appear misaligned until the font loads, causing a visible jump in the article hero area.

**Why it happens:**
`next/font` generates a `size-adjust` for the declared fallback automatically, but this calculation is only accurate for the weights and styles included in the `subsets` and `weight` configuration. An incomplete configuration (e.g., `weight: ['400']` when the design uses `weight: 700` for headlines) means some variants fall back without size-adjust compensation.

**How to avoid:**
- Audit all font weights and styles needed for v3.0 against the current `next/font` Newsreader configuration.
- Include `display: 'swap'` and `adjustFontFallback: true` explicitly.
- For the drop cap specifically: the `::first-letter` font-size is usually much larger than body text — even small metric differences cause visible layout shifts. Test the article page in Chrome DevTools with "Slow 3G" throttling and check if the first paragraph jumps when Newsreader loads.

**Warning signs:**
- Google Search Console Core Web Vitals reports CLS > 0.1 on article pages
- Article headline text "snaps" noticeably when Newsreader loads in slow network DevTools simulation
- Drop cap first letter jumps vertically on font load

**Phase to address:**
Phase implementing article detail redesign — verify CLS on article pages with network throttling before marking complete.

---

### Pitfall 7: Weather Widget Causes Hydration Mismatch in Next.js 15 SSR

**What goes wrong:**
A weather widget fetches current conditions from Open-Meteo. If the component fetches data in a Server Component and renders temperature/conditions, then the client hydrates and fetches again (or uses stale props), the server-rendered HTML and client-rendered HTML may differ (different time of fetch, different temperature reading). React throws a hydration mismatch error in development and silently overrides in production — but the override causes a flash of incorrect content.

More commonly: the weather widget includes a "last updated" timestamp. Any timestamp rendered server-side will not match the client's `Date.now()` at hydration time, causing an immediate hydration error.

**Why it happens:**
Next.js 15 Server Components fetch on the server; the HTML is sent to the client; React "hydrates" (attaches event handlers) and expects the DOM to match. Any dynamic value (current time, live API data) that differs between server render and client hydration causes a mismatch.

**How to avoid:**
Two valid strategies:

**Strategy A (recommended for weather):** Use a Server Component with ISR (`revalidate: 1800`) to fetch and render weather data. No timestamp in the rendered output. The server always renders the same cached data within the cache window — no mismatch. Add a "ca. X hours ago" relative indicator computed on the server from a static `fetchedAt` value.

**Strategy B:** Render the weather widget as a Client Component with `dynamic(() => import('./WeatherWidget'), { ssr: false })`. This skips SSR entirely — the widget shows a skeleton on first render and fetches on the client. No hydration mismatch possible, but the widget contributes to CLS (skeleton → content shift).

Do not use `suppressHydrationWarning` as a fix for weather data — it silences the error but allows stale server data to persist until client rehydration, which can show yesterday's weather to users with fast connections.

**Warning signs:**
- Next.js console shows "Text content does not match server-rendered HTML" on article or homepage
- Temperature shows differently on first render vs after page interaction
- "Hydration failed" error in browser console on the page containing the weather widget

**Phase to address:**
Phase implementing the weather widget — decide on Strategy A vs B at the start of that phase, not after seeing the error.

---

### Pitfall 8: Open-Meteo Free Tier Hits Rate Limit If Not Cached at the Application Level

**What goes wrong:**
Open-Meteo's free tier allows 10,000 API calls per day. This sounds generous, but on a Next.js platform with ISR and multiple Vercel serverless function invocations, the same weather fetch can be called many more times than expected:
- Each serverless cold start fetches independently (no shared memory cache between invocations)
- If `revalidate` is not set, Next.js in development mode fetches on every page render
- If the weather widget is also embedded in the CMS admin preview, it doubles calls

At the Vercel Hobby tier with 1,000 serverless function invocations per day and cold starts, 10,000 calls can be exhausted within hours if the fetch is not properly cached.

**Why it happens:**
In-memory caching (a Node.js `Map` or module-level variable) does not persist between serverless function invocations on Vercel — each cold start is a fresh process. Developers test locally where process memory persists across requests, assume caching works, and deploy to production where it does not.

**How to avoid:**
Use Next.js `fetch` with `next: { revalidate: 1800 }` (30 minutes) inside a Server Component or Route Handler. Next.js's built-in fetch cache is persisted in the Vercel Data Cache layer between invocations — this is the only cross-invocation cache available on Vercel Hobby without Redis.

```typescript
const weatherData = await fetch(
  `https://api.open-meteo.com/v1/forecast?latitude=47.07&longitude=15.45&current_weather=true`,
  { next: { revalidate: 1800 } }
);
```

Open-Meteo itself recommends updating no more than once per hour. 30-minute revalidation on Vercel is appropriate and keeps calls well below 500/day even with spikes.

**Warning signs:**
- HTTP 429 responses from `api.open-meteo.com` in Vercel function logs
- Weather widget renders empty or shows stale data from hours ago
- Vercel function invocation count unexpectedly high compared to pageviews

**Phase to address:**
Phase implementing the weather widget — caching strategy must be decided before the API integration, not as a fix after seeing 429 errors.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Remove old tokens and add new MD3 tokens in one commit | Faster migration | All components using old token names silently lose their styles — detected only in browser | Never — always two-phase rename |
| Add `-webkit-backdrop-filter` only to the nav component | Quick fix for Safari | Every new glassmorphism component added in future will also lack the prefix | Never — make it a CSS utility class or mixin |
| Use `initial-letter` without `@supports` guard | Cleaner code | Drop cap broken in Firefox for all users | Never on editorial content — always progressive enhance |
| Inline Open-Meteo fetch in a Client Component | Simpler code | Direct API calls from browser expose the endpoint pattern; no server-side cache; each client makes its own API call | Never — always server-side with caching |
| `suppressHydrationWarning` on weather data | Silences error immediately | Stale server-rendered data stays in DOM; misleads users | Never — fix the root cause |
| Apply `backdrop-blur` with high radius (blur(24px)+) on mobile | Looks impressive in screenshots | Scroll jank on Android; GPU compositing cost per frame | Never on full-width fixed elements |
| Use `--color-surface` to mean both the existing pale cream background and the new MD3 surface | Reuses existing token name | MD3 surface semantics (for cards, elevation) conflict with v2.0 background semantics | Never — rename to distinct names |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Open-Meteo + Next.js | In-memory cache in a module-level variable | Use `fetch` with `next: { revalidate: 1800 }` — Vercel Data Cache persists across invocations |
| Open-Meteo + Next.js | Fetching in a Client Component | Fetch in a Server Component or Route Handler; Client Component receives props |
| Open-Meteo + SSR | Rendering `new Date()` alongside weather data | Never render server-side timestamps that will differ at hydration; use relative descriptions or `suppressHydrationWarning` only on the timestamp element |
| next/font + Newsreader | Adding new font weights/styles without updating the font config | Always update both the `next/font` declaration and the `@theme` font token; verify no FOUT in DevTools |
| Tailwind v4 @theme + new tokens | Defining `--color-ink` without auditing existing `--color-text` usage | Run grep for all uses of token-derived utilities before renaming any token |
| CSS backdrop-filter + Tailwind v4 | Assuming `backdrop-blur-md` utility adds -webkit- prefix automatically | Manually verify with DevTools; add -webkit-backdrop-filter in a CSS class if missing |
| drop cap + Newsreader + first paragraph | Article body component wrapping first text node in a `<span>` for "AI-generated" label or similar | `::first-letter` will not target the correct character — ensure drop cap only applies to plain-text paragraphs |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| backdrop-blur on large fixed elements | Scroll jank on Android, <30fps | Keep blur radius ≤ 12px; add `will-change: transform`; test on real hardware | Any mid-range Android phone (common in Austrian regional demographics) |
| Multiple backdrop-blur elements on the same page | Compounding GPU cost; Safari artifacts | Limit to one backdrop-blur element per viewport | Two or more glass elements visible simultaneously |
| Newsreader font not subset correctly | FOUT on every page load; high LCP | Use `next/font` with explicit `subsets: ['latin']`; do not load all weights | Always — large font files affect LCP even on fast connections |
| Open-Meteo fetch without revalidate | 429 rate limit errors; weather widget breaks | Use `next: { revalidate: 1800 }` | After roughly 700 pageviews/day if every view triggers a fetch |
| CSS `initial-letter` on every article paragraph | Unintended multiple drop caps | Apply only to `p:first-of-type` within the article body container | Any article with multiple paragraphs |

---

## Security Mistakes

Not a high-risk area for this milestone. The weather API (Open-Meteo) requires no credentials — exposing the fetch URL is not a security risk. However:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Embedding Open-Meteo calls client-side with hardcoded coordinates | Reveals Graz/Styria location specificity to anyone inspecting network tab (low risk, public info) | Fetch server-side; client receives only the rendered data |
| Adding weather API key (if migrating to a paid weather API in future) to a `NEXT_PUBLIC_` variable | API key exposed in browser JavaScript bundle | Always use non-NEXT_PUBLIC_ variables for API credentials; fetch server-side only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Glassmorphic nav invisible on dark hero images | Users cannot see nav tabs against dark backgrounds | Ensure nav has sufficient background opacity (≥ 60%) to read against any image color |
| Drop cap on articles with short first paragraphs (1-2 lines) | Drop cap taller than the paragraph — ugly, broken layout | Add minimum paragraph length check; only apply drop cap if first paragraph has ≥ 4 lines of text |
| Weather widget shows Graz weather regardless of selected Bezirk | Users in Liezen (alpine) see weather for Graz (valley) — significantly different conditions | Lookup coordinates per selected Bezirk from `bundesland.config.ts` and pass to Open-Meteo |
| "No-Line Rule" applied to form inputs in CMS admin | Editors cannot identify text fields without borders | Restrict no-border philosophy to read-only editorial content; keep borders on form inputs in CMS |
| MD3 color token names ("Ink", "Parchment") used as Tailwind utility class names in HTML | Non-semantic class names like `text-ink` are harder to understand than `text-primary` in code review | Use semantic names that describe role, not appearance: `text-editorial` or `text-body` is better than `text-ink` if ink = body text |

---

## "Looks Done But Isn't" Checklist

- [ ] **Token migration complete:** Run `grep -r "bg-background\|bg-surface\|text-text\|border-primary" src/` — result must be zero before old tokens are removed
- [ ] **Safari backdrop-blur:** Test glassmorphic bottom nav on a physical iPhone — blur effect must be visible (not flat/transparent)
- [ ] **Android scroll performance:** Scroll the homepage on a mid-range Android device or with GPU throttling in Chrome DevTools — no visible jank
- [ ] **Firefox drop cap:** Open an article page in Firefox — first letter must render (float fallback, not `initial-letter`), aligned correctly
- [ ] **CLS on article page:** Run Chrome DevTools Lighthouse on an article page — CLS must be below 0.1
- [ ] **Hydration errors:** Open browser console on the homepage in development — no "Text content does not match" errors from the weather widget
- [ ] **Open-Meteo caching:** Check Vercel function logs — confirm the same weather URL is not being fetched on every request
- [ ] **WCAG non-text contrast:** Verify that interactive elements (nav tabs, region selector card, CTA buttons) have visually perceptible boundaries at 3:1 contrast
- [ ] **Drop cap on HTML-wrapped paragraphs:** Verify that articles where the AI prepends a `<strong>` tag or similar to the first paragraph do not show a broken drop cap
- [ ] **CMS admin unaffected:** Navigate every CMS admin page after token migration and confirm no visual regressions

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Token naming collision breaks CMS styling | MEDIUM | Revert `globals.css` to the two-phase state (both old and new tokens present); re-run migration pass more carefully |
| Safari backdrop-blur broken at launch | LOW | Add `-webkit-backdrop-filter` and minimum background opacity; redeploy — no data change needed |
| Open-Meteo 429 errors in production | LOW | Add `next: { revalidate: 1800 }` to the fetch call; redeploy; rate limit self-resolves within 24 hours |
| Firefox drop cap layout broken | LOW | Wrap `initial-letter` in `@supports`; add float fallback with correct line-height; redeploy |
| CLS > 0.1 on article pages from Newsreader | MEDIUM | Audit `next/font` config for all weights used; add missing weights; verify `adjustFontFallback: true` |
| Hydration mismatch from weather widget | LOW | Switch to `dynamic(() => ..., { ssr: false })` or remove timestamp from server-rendered output |
| Borderless design fails accessibility audit | HIGH | Cannot be resolved by color tweaks alone if the tonal palette was designed without contrast validation — may require adding subtle shadows or ring indicators to interactive elements; requires design review |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Token naming collision | Phase 1: Color System Foundation | grep for zero old utility classes before removing old tokens |
| MD3 surface/on-surface naming vs Tailwind existing tokens | Phase 1: Color System Foundation | Review every token name against existing globals.css; document all renames in a migration map |
| No-border WCAG 1.4.11 failure | Phase 1: Color System Foundation | WebAIM contrast check on every interactive element token pair |
| backdrop-blur iOS Safari | Phase implementing glassmorphic bottom nav | Physical iPhone test required in done criteria |
| backdrop-blur Android performance | Phase implementing glassmorphic bottom nav | Chrome DevTools GPU throttle test required in done criteria |
| drop cap Firefox | Phase implementing article detail | Firefox cross-browser test in done criteria |
| drop cap on HTML-wrapped first paragraph | Phase implementing article detail | Test with AI-generated article that has `<strong>` in first paragraph |
| Newsreader CLS | Phase implementing article detail | Lighthouse CLS score < 0.1 required in done criteria |
| Weather hydration mismatch | Phase implementing weather widget | Zero console hydration errors in development mode required |
| Open-Meteo rate limit | Phase implementing weather widget | Confirm `revalidate` in fetch config before writing the component |
| Weather Bezirk mismatch | Phase implementing weather widget | Confirm coordinates lookup from bundesland.config.ts, not hardcoded Graz |

---

## Sources

- [Tailwind CSS v4 Theme variables — official docs](https://tailwindcss.com/docs/theme) — confirmed @theme behavior, namespace generation, silent token removal
- [Tailwind CSS v4 — `@theme` directive not working issue #18966](https://github.com/tailwindlabs/tailwindcss/issues/18966) — confirms edge cases in CSS import + @theme interaction
- [MDN: initial-letter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/initial-letter) — confirmed Firefox non-support
- [Chrome Developers: CSS initial-letter](https://developer.chrome.com/blog/control-your-drop-caps-with-css-initial-letter) — confirmed Chrome 110+ and Safari (-webkit-) support
- [MDN: ::first-letter](https://developer.mozilla.org/en-US/docs/Web/CSS/::first-letter) — float-based fallback behavior
- [Mozilla Bugzilla #290125 — Firefox ::first-letter line-height bug](https://bugzilla.mozilla.org/show_bug.cgi?id=290125) — open since 2005, affects float-based drop cap alignment in Firefox
- [Tailwind CSS GitHub Issue #13844 — backdrop-blur not working in WebKit](https://github.com/tailwindlabs/tailwindcss/issues/13844) — community confirmed -webkit- prefix required
- [Adrian Roselli: Accessible Drop Caps](https://adrianroselli.com/2019/10/accessible-drop-caps.html) — accessibility considerations for ::first-letter
- [WCAG 2.1 SC 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) — 3:1 requirement for UI component boundaries
- [W3C WCAG GitHub Issue #800 — borderless button contrast](https://github.com/w3c/wcag/issues/800) — borderless interactive element WCAG interpretation
- [Open-Meteo Pricing / Rate Limits](https://open-meteo.com/en/pricing) — confirmed 10,000 calls/day free tier
- [Open-Meteo GitHub Issue #485 — API call limits](https://github.com/open-meteo/open-meteo/issues/485) — recommended update frequency (hourly)
- [Next.js Font Optimization — Vercel blog](https://vercel.com/blog/nextjs-next-font) — confirmed size-adjust and adjustFontFallback behavior
- [Tailwind CSS 4 and Next.js 15: Avoiding CLS With Fonts](https://medium.com/@sureshdotariya/tailwind-css-4-and-next-js-15-avoiding-cls-with-fonts-52498ed0a33b) — confirmed next/font + Tailwind v4 font CLS patterns
- [Next.js hydration error documentation](https://nextjs.org/docs/messages/react-hydration-error) — official guidance on SSR mismatch root causes and solutions
- [WebKit Bug #158807 — -webkit-backdrop-filter artifacts on rounded borders](https://bugs.webkit.org/show_bug.cgi?id=158807) — confirmed Safari artifact behavior with nested backdrop-filter

---
*Pitfalls research for: v3.0 The Modern Archivist design system overhaul (Next.js 15 / Tailwind v4)*
*Milestone: v3.0 The Modern Archivist*
*Researched: 2026-03-30*
