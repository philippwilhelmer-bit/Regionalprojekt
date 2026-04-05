---
phase: quick-002
type: bug-fix
tags: [navigation, footer, shell-polish]
requirements-completed: [SHEL-01, SHEL-02, SHEL-03]
metrics:
  duration_seconds: 90
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 002: Shell Polish Summary

**One-liner:** Extended WurzelNavBar active state to /artikel/* routes and anchored footer Kontakt link to dedicated #kontakt section on Impressum page.

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | WurzelNavBar active state on /artikel/* | Done |
| 2 | Footer Kontakt link differentiation | Done |

## Changes

**WurzelNavBar.tsx:** The Archiv tab's `isActive` check now matches both `pathname === "/"` and `pathname.startsWith("/artikel")`, so article detail pages show the Archiv tab as active.

**Footer.tsx:** Kontakt link changed from `/impressum` to `/impressum#kontakt` — scrolls directly to the contact section.

**impressum/page.tsx:** Renamed "Kontakt Datenschutz" heading to "Kontakt" and added `id="kontakt"` anchor for direct linking.
