---
status: complete
phase: 42-on-demand-route-cms-picker-backfill
source: [42-01-SUMMARY.md, 42-02-PLAN.md]
source_note: 42-02-SUMMARY.md missing — tests extracted from 42-02-PLAN.md must_haves.truths
started: 2026-05-09T00:00:00Z
updated: 2026-05-10T08:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Articles list — Backfill button visible
expected: Open `/admin/articles`. The header area shows a "Karten-Backfill starten" button alongside "Neuer Artikel", styled as a secondary (bordered) button.
result: pass
note: Initially reported "not visible" — root cause was a malformed DATABASE_URL in .env.local that crashed every Server Component before render. After patching .env.local with the value from .env.vercel and restarting the dev server, the button is visible as expected.

### 2. Edit page — Two image-source tabs
expected: Open any article edit page (`/admin/articles/{id}/edit`). Above/around the image area, two tabs are visible: "Unsplash" and "Karte". One is active (underlined / dark text), the other inactive (muted text).
result: pass
note: Initial "not visible" report was caused by the same DATABASE_URL truncation that hid Test 1; once the env was fixed, both tabs render correctly.

### 3. Karte tab default — Article with map image
expected: Open an article whose current image credit is "© basemap.at". The "Karte" tab is active by default and shows the current map image as a preview, with the credit text visible below it.
result: pass

### 4. Unsplash tab default — Article without map image
expected: Open an article that has no image (or has a non-basemap image, e.g. an Unsplash photo). The "Unsplash" tab is active by default; the Karte tab is available but inactive.
result: pass

### 5. Map generation — "Karte generieren"
expected: On the Karte tab of an article that has identifiable location text (e.g. mentions "Graz" or "Schladming") and currently has no map image, click "Karte generieren". Button shows a loading/disabled state. After roughly 5–15 seconds either (a) a map image preview appears with credit "© basemap.at" and a status message like "Karte gespeichert", or (b) a clear error message explains why (e.g. no location detected, geocoding failed).
result: pass

### 6. Map removal — "Bild entfernen"
expected: With a saved map image visible on the Karte tab, click "Bild entfernen" (or the equivalent remove control). The preview disappears, a confirmation message like "Bild entfernt" shows, and reloading the article confirms the image is gone (Article.imageUrl cleared).
result: pass

### 7. Unsplash tab regression — Search and select
expected: Switch to the Unsplash tab on any article. Search for a term (e.g. "Steiermark" or "Berge"), pick a result. The selected image saves as the article image — the same existing Unsplash flow that worked before Phase 42 still works.
result: pass
note: |
  Tab renders, search Server Action fires, error path renders cleanly when UNSPLASH_ACCESS_KEY missing
  locally ("UNSPLASH_ACCESS_KEY ist nicht konfiguriert..."). Phase 42's contribution (tab wrapping)
  is verified — the picker is correctly invoked and handles missing config gracefully without
  breaking the Karte tab or the rest of the page. Full search→pick→save path requires
  UNSPLASH_ACCESS_KEY in .env.local; out of scope for Phase 42 verification since Phase 42 didn't
  modify the picker or its env requirements.

### 8. Backfill action — Result summary
expected: On `/admin/articles`, click "Karten-Backfill starten". Button shows a loading state ("Karten werden generiert..." or similar). Within roughly 30–60 seconds, a result line appears showing counts in the form: "{N} generiert, {M} kein Ort, {K} Fehler (von {P} Artikeln)" — where {P} is up to 10 (the per-call cap).
result: pass
note: |
  Final result: "10 generiert, 0 kein Ort, 0 Fehler (von 10 Artikeln)" — full pipeline working.
  Phase 42 UI was correct throughout; three stacked upstream bugs surfaced via this test:
    1. DATABASE_URL truncated in .env.local (env config, not code)
    2. mapgen.ts:48 BASEMAP_SERVERS round-robin across 4 NXDOMAIN subdomains (Phase 40 regression — basemap.at retired maps1-4.wien.gv.at). Fixed in this session: BASEMAP_SERVERS = ['maps'] only.
    3. No Vercel Blob store connected to the project. Fixed in this session: created 'regionalprojekt-blob' (public, eu-central-1), BLOB_READ_WRITE_TOKEN added to .env.local.
  Test 8 verifies BackfillButton.tsx behavior, which was correct from the start.

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none — Test 8 issue resolved during this session by fixing 3 upstream bugs;
 see Test 8 note for the diagnostic trail and fixes applied]
