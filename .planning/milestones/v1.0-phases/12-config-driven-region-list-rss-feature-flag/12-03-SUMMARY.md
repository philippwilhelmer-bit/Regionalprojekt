---
phase: 12-config-driven-region-list-rss-feature-flag
plan: "03"
subsystem: reader-frontend
tags: [config-driven, bezirke, server-component, prop-passing, client-components]
dependency_graph:
  requires: [12-01]
  provides: [config-driven-region-ui]
  affects: [src/app/(public)/layout.tsx, src/components/reader/Header.tsx, src/components/reader/BezirkModal.tsx]
tech_stack:
  added: []
  patterns: [server-to-client-prop-passing, async-layout]
key_files:
  created: []
  modified:
    - src/app/(public)/layout.tsx
    - src/components/reader/Header.tsx
    - src/components/reader/BezirkModal.tsx
decisions:
  - "Async Server Component layout calls listBezirke() once and passes Bezirk[] to both Header and BezirkModal via props — single DB call, no API route needed"
  - "bezirkNames lookup map built inside useEffect from bezirke prop — avoids module-level closure over stale data"
  - "Prisma Bezirk[] passed directly to client components — structurally compatible with BezirkItem[] (has slug/name), no mapping needed"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 3
---

# Phase 12 Plan 03: Wire Public Layout to DB-driven Bezirke Summary

**One-liner:** Async (public)/layout.tsx fetches Bezirke from DB once via listBezirke() and passes them as props to Header and BezirkModal, removing all hardcoded region arrays from both Client Components.

## What Was Built

The public layout was converted from a synchronous Server Component to an async one, enabling a single `listBezirke()` DB call at the layout level. Both `Header` and `BezirkModal` were updated to accept a `bezirke: BezirkItem[]` prop, replacing their respective hardcoded `BEZIRK_NAMES` Record and `BEZIRKE` array. The UI now automatically reflects any future `config.regions` + seed changes without code edits.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Make layout async and pass bezirke prop | cbae61d | src/app/(public)/layout.tsx |
| 2 | Add bezirke prop to Header and BezirkModal, remove hardcoded arrays | 666b152 | src/components/reader/Header.tsx, src/components/reader/BezirkModal.tsx |

## Verification Results

- `tsc --noEmit` — passes with no errors
- `next build` — succeeds
- `grep BEZIRK_NAMES Header.tsx` — returns nothing (removed)
- `grep BEZIRKE BezirkModal.tsx` — returns nothing (removed)
- `grep "await listBezirke" layout.tsx` — returns match on line 13

## Decisions Made

- Async Server Component layout calls `listBezirke()` once — single DB call, no extra API route, no client-side fetching needed since layout is a Server Component
- `bezirkNames` lookup built inside `useEffect` from the `bezirke` prop — follows the pattern of computing derived values from props at point of use
- `Prisma Bezirk[]` passed directly without mapping to `BezirkItem[]` — structural compatibility means TypeScript accepts it, no runtime overhead for mapping

## Deviations from Plan

None — plan executed exactly as written.
