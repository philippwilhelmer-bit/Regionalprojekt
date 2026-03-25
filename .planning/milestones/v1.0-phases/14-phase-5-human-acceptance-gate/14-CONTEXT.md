# Phase 14: Phase 5 Human Acceptance Gate - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Formally sign off the 7 deferred CMS verification flows from Phase 5 (05-VERIFICATION.md `human_needed` items) by testing them against a running production/staging application. Additionally test and fix the known auth gap (commented-out `requireAuth()` in Server Actions). Updates 05-VERIFICATION.md status to `verified` and produces a 14-SIGN-OFF.md with full test results.

</domain>

<decisions>
## Implementation Decisions

### Testing process
- **Guided walkthrough** — Claude presents each test step-by-step, user confirms pass/fail after each one, Claude records results
- **Pre-checks before each test** — Claude runs diagnostic queries (DB, curl) to confirm prerequisites exist before asking user to act in the browser
- **Fix inline on failure** — if a test fails, Claude investigates, proposes a fix, user approves, retest before moving on
- **Dual interaction model** — Claude runs DB queries and HTTP checks for prerequisites/verification; user performs browser actions and confirms visual results
- **Test order** — Claude's discretion; auth gate first (other tests need a session), then logical dependency chain
- **Environment** — production/staging URL provided by user at test time (plan uses `{APP_URL}` placeholder)
- **DB access** — connection string provided at test time; Claude picks available tool (psql, Prisma CLI, etc.) at runtime

### Test data seeding
- **Auto-seed missing data** — Claude inserts test data via DB if prerequisites are missing (e.g. 200+ articles for filter test, REVIEW-status articles for exception queue)
- **Use real Steiermark config** — seed data distributed across all 13 Bezirke from bundesland.config.ts with realistic source types (OTS_AT, RSS)
- **Clean up after testing** — remove all Claude-seeded test data after verification is complete
- **Env vars** — ADMIN_PASSWORD, ADMIN_SESSION_SECRET, ANTHROPIC_API_KEY checked at runtime; plan does not assume they're pre-configured

### Pass/fail criteria
- **Function AND form** — both correct data flow and correct visual presentation required for a pass
- **Filter timing** — Claude's discretion; must feel responsive for an editorial tool (10s is the guideline, not a hard cutoff)
- **Exception queue readability** — both columns (rewritten article + raw source) visible side by side without horizontal scrolling or overlap
- **AI Config tone test** — requires triggering an actual pipeline run after changing tone to Formell; DB persistence alone is not sufficient
- **Pipeline trigger method** — Claude's discretion at runtime (manual script execution or wait for cron, based on what's available)
- **Per-source AI override** — DB persistence is sufficient (AiSourceConfig row created/deleted correctly); prompt output verification not required (16 automated tests cover merge logic)
- **Manual article creation** — verified in admin article list only; public reader site visibility is out of scope for this phase
- **No API key fallback** — if ANTHROPIC_API_KEY unavailable, Claude adapts (DB check for tone persistence, note pipeline trigger as untested)

### Auth gap verification
- **Test the vulnerability** — send direct POST to Server Action endpoint without session cookie to confirm whether it's exploitable
- **Fix if exploitable** — add `requireAuth()` to all mutation Server Actions before signing off (estimated ~8 functions)
- **Blocks sign-off** — confirmed exploitable auth bypass must be fixed before Phase 5 can be signed off as verified

### Sign-off artifact
- **Two deliverables:**
  1. Update `05-VERIFICATION.md` — change `status: human_needed` to `status: verified`, update score, add test results to each `human_verification` entry
  2. Create `14-SIGN-OFF.md` — detailed test results for all 7 flows + auth gap test, including fix log for any inline fixes
- **Fix log included** — document what was broken, what was fixed, and that it was retested (full audit trail)
- **Verifier attribution** — "Philipp + Claude (guided walkthrough)"
- **No screenshots** — verbal confirmation is sufficient evidence
- **Auto-commit** — Claude commits sign-off files after all tests pass

### Claude's Discretion
- Exact test execution order (after auth gate)
- DB tooling choice at runtime (psql vs Prisma CLI vs custom script)
- Seed data content (article titles, content, dates) — should look realistic
- Pipeline trigger method for AI Config test
- How to handle missing env vars gracefully
- Cleanup strategy for seeded data (transaction rollback vs targeted deletes)

</decisions>

<specifics>
## Specific Ideas

- The 7 human verification flows are already precisely defined in 05-VERIFICATION.md `human_verification` section — the plan should reference these directly, not re-derive them
- Auth gap is documented in 05-VERIFICATION.md Anti-Patterns section — `requireAuth()` calls commented out in articles-actions.ts and exceptions-actions.ts
- Seed data should include articles across all statuses (PUBLISHED, REVIEW, REJECTED, FAILED, ERROR) to test filters realistically

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `05-VERIFICATION.md` — complete list of 7 human verification flows with expected outcomes, already structured for test execution
- `bundesland.config.ts` — Steiermark config with all 13 Bezirke for realistic seed data generation
- `src/lib/admin/auth-node.ts` — `requireAuth()` function exists but is not called in mutation Server Actions
- `src/test/setup-db.ts` — `cleanDb()` function shows FK-safe deletion order for cleanup

### Established Patterns
- Server Actions use FormData wrappers (*Form suffix) alongside typed *Db functions
- Auth guard: middleware intercepts `/admin/:path*`, layout.tsx does secondary session check
- Singleton DB pattern for AiConfig and PipelineConfig (find-first-or-create)

### Integration Points
- `src/lib/admin/articles-actions.ts` lines 219-239 — mutation actions missing requireAuth()
- `src/lib/admin/exceptions-actions.ts` lines 59, 64 — same auth gap
- `src/lib/admin/sources-actions.ts` — likely same pattern (needs verification)
- `src/lib/ai/ai-run.ts` — pipeline entry point for manual trigger
- `src/lib/ai/steps/step2-write.ts` — reads AiConfig for tone/style, builds system prompt

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-phase-5-human-acceptance-gate*
*Context gathered: 2026-03-25*
