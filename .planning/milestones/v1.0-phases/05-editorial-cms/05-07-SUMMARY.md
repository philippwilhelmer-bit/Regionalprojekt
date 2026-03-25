---
phase: 05-editorial-cms
plan: 07
subsystem: ui
tags: [next.js, server-actions, server-components, tailwindcss, prisma, admin-ui, sources, ai-config]

# Dependency graph
requires:
  - phase: 05-02
    provides: Admin shell layout with sidebar nav; auth middleware for /admin routes
  - phase: 05-04
    provides: sources-actions.ts (createSourceDb, updateSourceDb, listSourcesAdmin); ai-config-dal.ts (getAiConfig, upsertAiConfig, upsertAiSourceConfig, deleteAiSourceConfig); pipeline-config-dal.ts (getPipelineConfig, upsertPipelineConfig)

provides:
  - /admin/sources page listing all sources with health badge, lastSuccessAt, run stats, failedErrorCount
  - SourceCard component with inline collapsible edit form for pollIntervalMinutes, healthFailureThreshold, enabled
  - /admin/sources/new form creating a new Source row via createSourceForm Server Action
  - /admin/ai-config page with three sections: global settings, per-source overrides, pipeline config
  - GlobalAiConfigForm: tone/articleLength/styleNotes/modelOverride bound to upsertAiConfigAction
  - SourceOverrideForm: per-source override UI with details element, bound to upsertAiSourceConfigAction / deleteAiSourceConfigAction
  - FormData-accepting Server Actions in ai-config-actions.ts, pipeline-config-actions.ts, and sources-actions.ts
  - revalidatePath('/admin/sources') and revalidatePath('/admin/ai-config') on form submission

affects: [06-launch, 07-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FormData Server Action pattern: HTML form action={serverAction} where serverAction(formData: FormData) — all admin forms follow this pattern"
    - "details/summary for collapsible inline forms — no JS state needed; open={condition} for server-side pre-expanded state"
    - "revalidatePath() called inside Server Actions to refresh page after mutation"
    - "Promise.all() for parallel server-side data fetching in Server Components"

key-files:
  created:
    - src/app/(admin)/admin/sources/page.tsx (Sources list page)
    - src/app/(admin)/admin/sources/SourceCard.tsx (Source card with inline edit)
    - src/app/(admin)/admin/sources/new/page.tsx (Add source form)
    - src/app/(admin)/admin/ai-config/page.tsx (AI Config page — 3 sections)
    - src/app/(admin)/admin/ai-config/GlobalAiConfigForm.tsx (Global AI settings form)
    - src/app/(admin)/admin/ai-config/SourceOverrideForm.tsx (Per-source override UI)
  modified:
    - src/lib/admin/ai-config-actions.ts (rewritten with FormData-accepting Server Actions)
    - src/lib/admin/pipeline-config-actions.ts (rewritten with FormData-accepting Server Action)
    - src/lib/admin/sources-actions.ts (added createSourceForm and updateSourceForm FormData wrappers)

key-decisions:
  - "ai-config-actions.ts rewritten from typed-arg stubs to FormData-accepting Server Actions — HTML form action={} requires (formData: FormData) signature; Plan 04 stubs used typed inputs which are incompatible with native form submission"
  - "pipeline-config-actions.ts rewritten same way — upsertPipelineConfigAction(formData: FormData) parses maxRetryCount/deadManThresholdHours with parseInt"
  - "createSourceForm and updateSourceForm added alongside existing typed createSource/updateSource — preserves typed API for programmatic use while enabling HTML form submission"
  - "SourceOverrideForm uses details open={hasOverride} for server-side pre-expanded state — open only when override exists, no client JS needed"
  - "AI Config page loads AiConfig + Sources+aiSourceConfig + PipelineConfig in Promise.all() — single concurrent DB round-trip"
  - "AiSourceConfig tone/articleLength selects include empty option (value='') for null/global fallback — empty string parsed as undefined in Server Action, which DAL accepts as no override"

patterns-established:
  - "FormData Server Action: parse with formData.get('field')?.toString() || null/undefined; use parseInt for numbers; empty string = null/undefined for optional fields"
  - "Collapsible inline form: <details><summary>...</summary><form>...</form></details> — server-side pre-open with open={condition}"

requirements-completed: [CMS-04, AICONF-01, AICONF-02, AICONF-03]

# Metrics
duration: 12min
completed: 2026-03-22
---

# Phase 5 Plan 07: Sources Management + AI Config Pages Summary

**Sources management UI at /admin/sources and AI Config page at /admin/ai-config — all forms use Server Actions with FormData, no client JS required for mutations**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-22T12:17:26Z
- **Completed:** 2026-03-22T12:29:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- /admin/sources lists all sources with health badge (OK/DEGRADED/DOWN in color-coded Tailwind), lastSuccessAt timestamp, latest IngestionRun stats (items found/new), and FAILED+ERROR article count per source
- SourceCard has inline collapsible edit form (details/summary) for pollIntervalMinutes, healthFailureThreshold, and enabled toggle — updateSourceForm Server Action with revalidatePath
- /admin/sources/new form with URL, type (OTS_AT/RSS select), poll interval — createSourceForm Server Action redirects to /admin/sources on success
- /admin/ai-config has three sections: GlobalAiConfigForm (tone/articleLength/styleNotes/modelOverride), SourceOverrideForm per source (collapsible, pre-expanded when override exists), and PipelineConfig section (maxRetryCount, deadManThresholdHours)
- All Server Actions rewritten or added to accept FormData for direct HTML form binding
- TypeScript: 0 errors; next build: success; vitest: 139/139 tests GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Server Action wrappers + Sources management pages** - `aefe85b` (feat)
2. **Task 2: AI Config page (global settings + per-source overrides + PipelineConfig)** - `4c00509` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/(admin)/admin/sources/page.tsx` — Sources list page: calls listSourcesAdmin(), renders SourceCard list, empty state, "Neue Quelle" link
- `src/app/(admin)/admin/sources/SourceCard.tsx` — Source card: health badge, lastSuccessAt, run stats, failedErrorCount, collapsible inline edit form with updateSourceForm
- `src/app/(admin)/admin/sources/new/page.tsx` — Add source form: URL text, type select (OTS_AT/RSS), pollIntervalMinutes number, createSourceForm action
- `src/app/(admin)/admin/ai-config/page.tsx` — AI Config page: Promise.all() data fetch, three sections (GlobalAiConfigForm, SourceOverrideForm per source, pipeline inline form)
- `src/app/(admin)/admin/ai-config/GlobalAiConfigForm.tsx` — Tone/articleLength selects + styleNotes textarea + modelOverride text input, pre-filled from AiConfig, action=upsertAiConfigAction
- `src/app/(admin)/admin/ai-config/SourceOverrideForm.tsx` — Per-source override: details/summary collapsible, open when override exists, upsertAiSourceConfigAction + deleteAiSourceConfigAction
- `src/lib/admin/ai-config-actions.ts` — Rewritten: upsertAiConfigAction(formData), upsertAiSourceConfigAction(formData), deleteAiSourceConfigAction(formData), all with revalidatePath
- `src/lib/admin/pipeline-config-actions.ts` — Rewritten: upsertPipelineConfigAction(formData) with parseInt for both number fields
- `src/lib/admin/sources-actions.ts` — Added createSourceForm(formData) with redirect, updateSourceForm(formData) with revalidatePath; existing typed functions preserved

## Decisions Made

- Plan 04 created `ai-config-actions.ts` and `pipeline-config-actions.ts` as typed-argument stubs, but HTML form `action={}` requires `(formData: FormData)` signature. Both files were fully rewritten to accept FormData, parsing all fields from form submission. This is a necessary correctness fix — typed stubs cannot be used as form actions.
- `createSourceForm` and `updateSourceForm` added alongside existing typed `createSource`/`updateSource` in sources-actions.ts — preserves typed API for any programmatic callers while enabling HTML form binding.
- SourceOverrideForm uses `open={hasOverride}` on the details element so the override form is pre-expanded when an override exists — no client-side JS state needed.
- AI Config page uses `prisma.source.findMany({ include: { aiSourceConfig: true } })` directly (not via sources-actions.ts) to get the aiSourceConfig relation in one query — sources-actions.ts returns SourceAdminRow which doesn't include the relation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan 04 Server Action stubs used typed args instead of FormData**
- **Found during:** Task 1 — plan specifies `upsertAiConfigAction(formData: FormData)` for HTML form use
- **Issue:** Plan 04 created stubs with typed arguments (e.g., `upsertAiConfigAction(data: Partial<{tone, articleLength, ...}>)`) which cannot be used as HTML form action — Next.js form action requires `(formData: FormData)` signature
- **Fix:** Fully rewrote ai-config-actions.ts and pipeline-config-actions.ts with proper FormData-accepting signatures and revalidatePath calls
- **Files modified:** `src/lib/admin/ai-config-actions.ts`, `src/lib/admin/pipeline-config-actions.ts`
- **Verification:** npx tsc --noEmit clean; forms bind correctly to Server Actions
- **Committed in:** `aefe85b`

---

**Total deviations:** 1 auto-fixed (1 bug — mismatched Server Action signature from Plan 04 stubs)
**Impact on plan:** Required fix for correct form binding. No scope creep.

## Issues Encountered

None — TypeScript was clean on first attempt. Build and tests passed without iteration.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 is now complete: all 7 plans executed
- CMS-04 (source management UI) fully implemented with health dashboard, inline edit, add form
- AICONF-01/02/03 (AI config editable from admin UI) fully implemented with global form, per-source overrides, pipeline config
- All admin pages operational: /admin/articles, /admin/exceptions, /admin/sources, /admin/ai-config
- 139 tests GREEN; next build success

## Self-Check: PASSED

- FOUND: src/app/(admin)/admin/sources/page.tsx
- FOUND: src/app/(admin)/admin/sources/SourceCard.tsx
- FOUND: src/app/(admin)/admin/sources/new/page.tsx
- FOUND: src/app/(admin)/admin/ai-config/page.tsx
- FOUND: src/app/(admin)/admin/ai-config/GlobalAiConfigForm.tsx
- FOUND: src/app/(admin)/admin/ai-config/SourceOverrideForm.tsx
- FOUND commit: aefe85b (Task 1)
- FOUND commit: 4c00509 (Task 2)

---
*Phase: 05-editorial-cms*
*Completed: 2026-03-22*
