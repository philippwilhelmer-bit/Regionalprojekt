---
phase: quick-002
type: bug-fix
tags: [navigation, footer, shell-polish]
---

# Quick Task 002: Shell Polish (Phase 39)

## Objective

Fix nav active state on /artikel/* routes and differentiate Kontakt link from Impressum.

## Tasks

| # | Description | Files | Action |
|---|-------------|-------|--------|
| 1 | Extend WurzelNavBar active state to match /artikel/* under Archiv tab | src/components/reader/WurzelNavBar.tsx | Add `pathname.startsWith("/artikel")` to isActive check for "/" |
| 2 | Differentiate Kontakt from Impressum in footer | src/components/reader/Footer.tsx, src/app/(public)/impressum/page.tsx | Add id="kontakt" anchor to Impressum page, update footer link to /impressum#kontakt |
