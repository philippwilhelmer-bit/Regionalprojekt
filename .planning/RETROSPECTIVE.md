# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-25
**Phases:** 15 | **Plans:** 52 | **Timeline:** 5 days

### What Was Built
- Autonomous AI news platform with full ingestion → generation → publish pipeline
- Editorial CMS with auth, article CRUD, exception queue, source management, AI config
- Reader frontend with "Mein Bezirk" personalization, RSS feeds, SEO, AdSense, Impressum
- Config-driven Bundesland deployment (change one file to deploy for a new region)
- Extensibility validated with second RSS adapter (ORF Steiermark)

### What Worked
- Wave 0 (test stubs first) pattern prevented integration surprises — tests existed before implementation
- Config-driven architecture payoff: phases 9-13 were mostly wiring config into existing components
- pgLite in-process test DB eliminated infrastructure dependency — fast tests, zero setup
- Server Component CMS with FormData actions — minimal boilerplate vs API layer approach
- Milestone audit (phases 8-15) caught real gaps before declaring v1.0 done

### What Was Inefficient
- Phase 5 was the largest phase (8 plans) — auth split (node/edge) and Tailwind v3→v4 upgrade caused unexpected rework
- OTS.at API format researched but never verified with real credentials — defensive field extraction may need revision
- Phases 8-15 were gap-closure phases added after initial 7-phase roadmap — better upfront audit would have caught these earlier
- Some plan summaries recorded `0 tasks` due to state tracking inconsistency

### Patterns Established
- DI via TypeScript overloads: zero-arg for production singleton, client-injection for tests
- Wave 0 stubs with `it.todo()` — no imports until implementation exists
- Migration SQL hand-crafted for pgLite compatibility (sorted directory scan)
- `*Db` functions exported separately from Server Action wrappers for testability
- `bundesland.config.ts` as single source of truth for all deployment-specific values

### Key Lessons
1. Plan the milestone audit phases upfront — gap-closure phases (8-15) doubled the phase count but were necessary for production quality
2. Auth in Next.js 15 with Edge middleware requires separate node/edge modules — plan for this complexity early
3. Adapter pattern pays off quickly — second RSS adapter was trivial to add, validating the architecture
4. Config-driven deployment is worth the upfront investment — wiring phases are small and mechanical

### Cost Observations
- Model mix: balanced profile (opus for planning/verification, sonnet for execution, haiku for tools)
- Sessions: ~15-20 across 5 days
- Notable: gap-closure phases (8-15) were fast — mostly 1-3 plan phases with mechanical changes

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 5 days | 15 | Initial build — gap-closure phases added mid-milestone |

### Cumulative Quality

| Milestone | LOC | Files | Architecture |
|-----------|-----|-------|-------------|
| v1.0 | 10,303 | 278 | Config-driven, adapter pattern, Server Components |

### Top Lessons (Verified Across Milestones)

1. Wave 0 test stubs before implementation catches integration issues early
2. Config-driven architecture reduces per-deployment effort to near-zero
