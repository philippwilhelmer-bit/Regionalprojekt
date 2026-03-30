---
phase: 27-app-chrome
verified: 2026-03-28T22:15:00Z
status: human_needed
score: 3/3 must-haves verified
re_verification: false
human_verification:
  - test: "App bar renders WURZELWELT centered with Wurzelmann avatar on all reader pages"
    expected: "Bold uppercase Newsreader 'WURZELWELT' centered, Wurzelmann avatar (32x32 rounded-full ring) to its left, bezirk selector on far right — no Styrian flag stripe visible"
    why_human: "Visual layout and font rendering cannot be verified from source code alone"
  - test: "Bottom nav active tab terracotta pill — homepage vs. /suche"
    expected: "Nachrichten tab shows bg-accent terracotta pill with white icon when on '/'; switching to '/suche' moves the pill to the Suche tab"
    why_human: "Active state is runtime behavior driven by usePathname(); requires browser navigation to confirm"
  - test: "Bezirk selector modal opens from app bar"
    expected: "Clicking the location_on button fires openBezirkModal CustomEvent and opens the BezirkModal"
    why_human: "CustomEvent dispatch and modal open behavior requires runtime verification"
  - test: "Disabled tabs are non-interactive"
    expected: "Gemerkt and Profil tabs are rendered as divs (not links), appear at opacity-30, and cannot be navigated to"
    why_human: "Interactivity behavior requires human confirmation in browser"
---

# Phase 27: App Chrome Verification Report

**Phase Goal:** Replace RegionalAppBar and RegionalNavBar with Wurzelwelt-branded app chrome (centered logo app bar + 4-tab icon nav bar)
**Verified:** 2026-03-28T22:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The header shows WURZELWELT in bold uppercase Newsreader centered on the bar with the Wurzelmann avatar beside it | ? NEEDS HUMAN | `WurzelAppBar.tsx` L50: `font-headline uppercase font-bold text-white text-xl tracking-wide` + `config.siteName`; L43-49: `next/image` 32x32 `rounded-full ring-2 ring-white/30` — visually confirmed only in browser |
| 2 | The bottom navigation has exactly 4 tabs with rounded Material Symbols icons and active tab indicated with Wurzelwelt accent | ✓ VERIFIED | `WurzelNavBar.tsx`: `NAV_ITEMS` array has exactly 4 entries; `bg-accent` pill + `text-accent` label on active tab; `material-symbols-outlined` icons; `rounded-t-2xl` nav |
| 3 | Both app bar and bottom nav are visible on every reader page (homepage, article detail, search) | ✓ VERIFIED | `layout.tsx` L33: `<WurzelAppBar bezirke={bezirke} />` and L37: `<WurzelNavBar />` present in the single public layout that wraps all `(public)` routes |

**Score:** 2/3 automated — 1 requires human confirmation (visual rendering). All automated evidence passes.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/reader/WurzelAppBar.tsx` | Wurzelwelt-branded app bar component | ✓ VERIFIED | 69 lines, exports `WurzelAppBar`, `"use client"`, `next/image`, `computeBezirkLabel`, `openBezirkModal` dispatch, `font-headline uppercase font-bold`, centered layout |
| `src/components/reader/WurzelNavBar.tsx` | Wurzelwelt 4-tab bottom navigation | ✓ VERIFIED | 73 lines, exports `WurzelNavBar`, `"use client"`, `usePathname`, 4-item `NAV_ITEMS`, `bg-accent` active pill, `rounded-t-2xl` |
| `src/app/(public)/layout.tsx` | Public layout wiring new components | ✓ VERIFIED | Imports `WurzelAppBar` (L6) and `WurzelNavBar` (L7), renders both (L33, L37) — old `Regional*` imports are gone |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(public)/layout.tsx` | `src/components/reader/WurzelAppBar.tsx` | `import.*WurzelAppBar` | ✓ WIRED | L6: `import { WurzelAppBar } from "@/components/reader/WurzelAppBar"` + rendered at L33 with `bezirke={bezirke}` |
| `src/app/(public)/layout.tsx` | `src/components/reader/WurzelNavBar.tsx` | `import.*WurzelNavBar` | ✓ WIRED | L7: `import { WurzelNavBar } from "@/components/reader/WurzelNavBar"` + rendered at L37 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COMP-01 | 27-01-PLAN.md | WurzelAppBar with centered "WURZELWELT" in bold uppercase Newsreader + Wurzelmann avatar | ✓ SATISFIED | `WurzelAppBar.tsx`: `font-headline uppercase font-bold text-white text-xl tracking-wide` + 32x32 `wurzelmann.png` `rounded-full ring-2 ring-white/30`; mascot asset confirmed at `public/images/wurzelmann.png` |
| COMP-06 | 27-01-PLAN.md | WurzelNavBar 4-tab bottom nav with rounded Material Symbols icons | ✓ SATISFIED | `WurzelNavBar.tsx`: 4-item `NAV_ITEMS`, `material-symbols-outlined` icons, `bg-accent` terracotta active pill, `rounded-t-2xl` top corners |

No orphaned requirements found — REQUIREMENTS.md maps only COMP-01 and COMP-06 to Phase 27.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None detected | — | — |

No TODO/FIXME/placeholder comments. No empty return values. No stub handlers. No orphaned exports.

### Human Verification Required

#### 1. Visual rendering of app bar brand elements

**Test:** Run `npm run dev`, open http://localhost:3000 and visually inspect the header.
**Expected:** "WURZELWELT" appears in bold uppercase Newsreader serif font, centered horizontally. Wurzelmann avatar (circular, white ring) is immediately to its left. No Styrian flag stripe at the top. Bezirk location button is on the far right.
**Why human:** Font rendering, image loading, and layout pixel-correctness cannot be asserted from source.

#### 2. Active tab terracotta pill behavior

**Test:** Open http://localhost:3000 (homepage) and inspect the bottom nav. Then navigate to /suche.
**Expected:** On /, the "Nachrichten" tab has a terracotta pill behind the newspaper icon and the label is bold terracotta. On /suche, the "Suche" tab receives the pill and "Nachrichten" returns to inactive state.
**Why human:** `usePathname()` active-state routing requires runtime navigation to confirm.

#### 3. Bezirk modal trigger

**Test:** Click the location button in the app bar.
**Expected:** The BezirkModal opens (it is wired in layout.tsx alongside WurzelAppBar).
**Why human:** `window.dispatchEvent(new CustomEvent("openBezirkModal"))` cross-component event requires browser runtime.

#### 4. Disabled tab non-interactivity

**Test:** Click the "Gemerkt" and "Profil" tabs.
**Expected:** Nothing happens — they are `<div>` elements at `opacity-30`, not links.
**Why human:** Requires browser interaction to confirm non-navigation.

### Gaps Summary

No automated gaps. All three artifacts exist, are substantive (not stubs), and are correctly wired into the public layout. TypeScript compiles with zero errors (`npx tsc --noEmit` returned no output). Both documented commits (`ec14e76`, `b312ced`) are verified in git history. The four human verification items are confirmations of runtime/visual behavior that the automated scan cannot reach — they are not blocking concerns given the code evidence, but should be confirmed before calling the phase closed.

---

_Verified: 2026-03-28T22:15:00Z_
_Verifier: Claude (gsd-verifier)_
