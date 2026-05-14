---
phase: 46-aerzteverzeichnis
plan: 03
subsystem: ui
tags: [admin, crud, server-components, server-actions, tailwind, next-app-router, doctor-directory]

# Dependency graph
requires:
  - phase: 46-aerzteverzeichnis/00
    provides: --dir-* design tokens in globals.css @theme
  - phase: 46-aerzteverzeichnis/01
    provides: Doctor Prisma model + listDoctors / getDoctorById DAL
  - phase: 46-aerzteverzeichnis/02
    provides: createDoctorForm / updateDoctorForm / toggleVerifiedForm / softDeleteDoctorForm Server Actions
provides:
  - /admin/aerzte list page with bezirk/kategorie/verified filter chips
  - /admin/aerzte/new doctor creation form
  - /admin/aerzte/[id]/edit doctor edit form with pre-filled defaults and missing-geo warning
  - DoctorRow row component with edit / toggle-verified / delete actions
  - JS-less <details> two-step delete confirmation pattern (re-usable by other admin rows)
  - DoctorForm shared Server Component (same JSX for create and edit, formAction-bound)
affects: [46-05 (AppBar/Footer link target — admin shell unaffected), future admin-CRUD plans]

# Tech tracking
tech-stack:
  added: []  # No new npm dependencies
  patterns:
    - "Shared form via Server Component + formAction prop (no 'use client' boundary needed)"
    - "JS-less <details>/<summary> two-step destructive-action confirmation in Server Components"
    - "Auth delegation: pages under (admin)/* do NOT call requireAuth() — layout gates the route group"

key-files:
  created:
    - src/app/(admin)/admin/aerzte/page.tsx
    - src/app/(admin)/admin/aerzte/DoctorFilters.tsx
    - src/app/(admin)/admin/aerzte/DoctorRow.tsx
    - src/app/(admin)/admin/aerzte/DoctorForm.tsx
    - src/app/(admin)/admin/aerzte/new/page.tsx
    - src/app/(admin)/admin/aerzte/[id]/edit/page.tsx
  modified: []

key-decisions:
  - "Delete confirmation uses JS-less <details>/<summary> two-step disclosure instead of 'use client' + window.confirm — keeps DoctorRow as a Server Component and avoids a client boundary for one button"
  - "DoctorForm is a Server Component (no 'use client'); shared by /new and /[id]/edit; formAction prop binds the correct Server Action (createDoctorForm vs updateDoctorForm)"
  - "Pages do NOT call requireAuth() — (admin)/layout.tsx already gates every /admin/* route via verifySessionCookie; mirrors the established /admin/articles pattern"
  - "Filter UI lives in DoctorFilters.tsx ('use client') — useSearchParams + router.push for query-param chip toggles; list page itself stays a Server Component"
  - "Missing-geo warning surfaces in two places: row-level chip (⚠ keine Koordinaten in DoctorRow) and prominent error block in DoctorForm when editing a row with lat=null — both bound to bg-dir-error-container token"

patterns-established:
  - "Admin row component: link-as-title + verification chip + warning chip + action cluster (Edit link, toggle form, delete form); all action surfaces use Server Action formAction binding"
  - "Shared form across /new and /[id]/edit: single DoctorForm.tsx component, parent pages pass formAction + submitLabel + optional doctor prop for defaults"
  - "JS-less destructive confirm via <form action={...}><details><summary>Löschen</summary><button>Wirklich löschen</button></details></form> — works without a client boundary"

requirements-completed: [DIR-06]

# Metrics
duration: 40 min
completed: 2026-05-14
---

# Phase 46 Plan 03: Admin CRUD UI for Doctor Directory Summary

**Admin CRUD shell at `/admin/aerzte` — list page with bezirk/kategorie/verified filter chips, shared DoctorForm Server Component for /new and /[id]/edit, and a row component with edit / toggle-verified / JS-less delete-confirm — completes DIR-06 and ships the entire editorial mutation surface for the doctor directory.**

## Performance

- **Duration:** 40 min (including manual verification + DB migration window)
- **Started:** 2026-05-14T13:07:00Z (Task 3.1)
- **Completed:** 2026-05-14T13:46:48Z (after checkpoint approval)
- **Tasks:** 3 (2 implementation + 1 manual verification checkpoint)
- **Files created:** 6
- **Files modified:** 0

## Accomplishments

- `/admin/aerzte` list page (Server Component, `force-dynamic`) reading `listDoctors` with bezirk/kategorie/isVerified filters from `searchParams`
- `DoctorFilters` client component drives filter chip groups via `useSearchParams` + `router.push`
- `DoctorRow` server-rendered row with link-as-title, verification chip, missing-geo warning, and three action surfaces (Edit link, Verifizieren toggle, Löschen)
- `DoctorForm` shared Server Component used by both /new and /[id]/edit — same JSX, parent passes `formAction` + `submitLabel`; pre-filled `defaultValue`s when editing
- `/admin/aerzte/new` and `/admin/aerzte/[id]/edit` thin Server Components composing DoctorForm
- Edit page reads via `getDoctorById`, calls `notFound()` on missing id
- Missing-geo signal surfaces in two complementary places: row-level chip + form-level error block (both `bg-dir-error-container`)

## Task Commits

1. **Task 3.1: Admin list page + filters + row + shared form** — `70cf5f4` (feat)
   - 4 files: page.tsx, DoctorFilters.tsx, DoctorRow.tsx, DoctorForm.tsx
   - 641 insertions
2. **Task 3.2: New + Edit pages** — `6956d4b` (feat)
   - 2 files: new/page.tsx, [id]/edit/page.tsx
   - 81 insertions
3. **Task 3.3: Manual admin CRUD verification (checkpoint:human-verify)** — no commit (verification gate); human approved

**Plan metadata:** (this commit) — `docs(46-03): complete admin CRUD UI plan`

## Files Created

- `src/app/(admin)/admin/aerzte/page.tsx` — Server Component list page; parses kategorie/isVerified/bezirk from searchParams, dispatches to `listDoctors({ bezirkSlug, kategorie, isVerified, limit: 200 })` + `listBezirke()`; renders `DoctorFilters` and a `divide-y` list of `DoctorRow`s; `export const dynamic = 'force-dynamic'`
- `src/app/(admin)/admin/aerzte/DoctorFilters.tsx` — `'use client'` filter chip groups (Bezirk, Kategorie, Verified) driven by `useSearchParams` + `useRouter.push`; pill-shaped chips per DESIGN.md
- `src/app/(admin)/admin/aerzte/DoctorRow.tsx` — Server Component row: link-as-title, verification chip, missing-geo chip, Edit link, `<form action={toggleVerifiedForm}>`, `<form action={softDeleteDoctorForm}>` with JS-less `<details>` confirm
- `src/app/(admin)/admin/aerzte/DoctorForm.tsx` — Server Component shared form (no 'use client'). Props `{ doctor?, bezirke, formAction, submitLabel }`. Fields: name, titel, kategorie, fachrichtung, address, bezirkId, email, website, phone, editorialNote, relatedArticleIds; hidden `id` when editing; missing-geo error block when `doctor && doctor.lat === null && doctor.address`
- `src/app/(admin)/admin/aerzte/new/page.tsx` — thin Server Component, `force-dynamic`, awaits `listBezirke()`, renders `DoctorForm` with `formAction={createDoctorForm}` and `submitLabel="Anlegen"`
- `src/app/(admin)/admin/aerzte/[id]/edit/page.tsx` — `force-dynamic`, parses `id` from awaited params, calls `Promise.all([getDoctorById, listBezirke])`, `notFound()` if missing, renders `DoctorForm` with `formAction={updateDoctorForm}` and `submitLabel="Speichern"`

## Tailwind Utility Sample (--dir-* tokens used)

Surface / layout:
- `bg-dir-surface-container-lowest` (list container)
- `bg-dir-surface-container-low` (row hover)
- `bg-dir-surface-container` (chip inactive)
- `divide-dir-outline-variant` (row dividers)
- `border-dir-outline-variant` (action buttons)
- `rounded-dir-md` / `rounded-dir-sm` / `rounded-dir-full`
- `p-dir-md` / `gap-dir-md` / `gap-dir-sm` / `px-dir-sm` / `py-dir-xs` / `mt-dir-xs`

Foreground / state:
- `text-dir-on-surface` / `text-dir-on-surface-variant` (primary + secondary text)
- `bg-dir-tertiary-container text-dir-on-tertiary-container` (verified badge)
- `bg-dir-error-container text-dir-on-error-container` (missing-geo chip + form warning)
- `text-dir-error` / `bg-dir-error text-dir-on-error` (delete button states)
- `bg-dir-secondary-container` (active filter chip)

Existing (non-`--dir-*`) admin-shell tokens reused for page chrome:
- `text-ink` / `text-ink-muted` / `bg-surface-elevated` / `from-ink to-ink-soft text-parchment` (top header + primary action button) — consistent with `/admin/articles` chrome

## Decisions Made

1. **JS-less `<details>` delete confirm.** Originally the plan suggested a confirm dialog; the chosen implementation wraps the destructive button in `<form action={softDeleteDoctorForm}><details><summary>Löschen</summary><button>Wirklich löschen</button></details></form>`. First click expands the disclosure (revealing the real submit button); second click submits the Server Action. Keeps DoctorRow a pure Server Component — no `'use client'` boundary needed for one row of admin chrome. Re-usable for any future destructive admin action.
2. **DoctorForm is a Server Component (no `'use client'`).** Form fields are uncontrolled (`defaultValue` for edit), `formAction` prop wires the correct Server Action, no client state needed. This was the planned shape and held up cleanly.
3. **Auth delegation to layout.** No `requireAuth()` calls anywhere in the new files. `(admin)/layout.tsx` already does `verifySessionCookie + redirect('/admin/login')` for every route under the (admin) group. Confirmed empirically in checkpoint Step 7 (incognito redirects on /new and /[id]/edit).
4. **Two-surface missing-geo signal.** Row chip (`⚠ keine Koordinaten`) for at-a-glance scanning of the list; full warning block in DoctorForm (`bg-dir-error-container` panel above the fields) so the editor sees the problem and remediation hint when actually editing that row.
5. **Top-of-page admin chrome uses existing tokens, not `--dir-*`.** Page heading, "Neuer Arzt" gradient button, and filter card wrapper use `text-ink` / `bg-surface-elevated` / `from-ink to-ink-soft text-parchment` to stay consistent with the rest of the admin shell. Only the doctor-specific surfaces (list rows, chips, form fields, warnings) use `--dir-*` tokens. Deliberate — `--dir-*` is the directory feature's design language, not a replacement for the admin chrome.

## Deviations from Plan

None - plan executed exactly as written.

The JS-less `<details>` delete confirm is documented above as a Decision (not a deviation): the plan said "wrap delete button in a `<details>` confirmation or simple onSubmit confirm (mirror articles-row pattern)" — the implementation took the `<details>` branch verbatim. No auto-fix rules fired during execution.

## Issues Encountered

**Out-of-band: Doctor table missing in dev DB.** During checkpoint verification, the Neon dev DB did not have the `Doctor` table — the additive migration from Plan 46-01 (`prisma/migrations/20260515_phase46_doctors/migration.sql`) had only been applied locally / not against Neon. Resolution: ran `npx prisma migrate deploy` against the Neon dev DB, which applied the migration cleanly (Doctor table + indexes created, no other schema state touched). After that, Tasks 3.3 verification steps 1-7 all passed.

This is a deployment-process gap (the migration was authored in Plan 46-01 but the apply-to-Neon step never ran), not a 46-03 implementation issue. Documenting here so future planners know:
- Plan 46-01 added the migration file
- Plan 46-03 verification was the first time the DB-write path was exercised end-to-end against Neon
- Future phases that add migrations should explicitly include a "deploy to dev DB" step in the plan or verify the migration deploys cleanly as part of plan-level verification

(The carry-over todo in STATE.md "Add `prisma migrate deploy` to Vercel build script" addresses the production side of the same gap — auto-deploy on push.)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **DIR-06 complete:** the admin can create / edit / verify-toggle / delete doctor entries from `/admin/aerzte` end-to-end. Verified manually against Neon dev DB.
- **Ready for Plan 46-05:** sitemap inclusion + AppBar/Footer "Ärzte" link + end-to-end smoke checkpoint. All upstream waves complete (46-00 design tokens, 46-01 model + DAL, 46-02 Server Actions, 46-03 admin UI, 46-04 public pages).
- **Dev server still running** (background id `bh1y0bney`) — leave running for Plan 46-05 manual verification.
- **No blockers.** Phase 46 is now 5/6 plans complete; only 46-05 (sitemap + nav-link + smoke) remains.

## Self-Check: PASSED

All 6 claimed files exist on disk; both task commits (`70cf5f4`, `6956d4b`) found in `git log --all`.

---
*Phase: 46-aerzteverzeichnis*
*Completed: 2026-05-14*
