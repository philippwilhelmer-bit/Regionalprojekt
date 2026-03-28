# Requirements: Regionalprojekt v1.2

**Defined:** 2026-03-26
**Core Value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.

## v1.2 Requirements

### SEO Blocking

- [x] **SEO-01**: All pages serve `noindex, nofollow` meta tags when test mode is active
- [x] **SEO-02**: `robots.txt` disallows all crawlers when test mode is active
- [x] **SEO-03**: Sitemap returns empty/minimal response when test mode is active

### Test Visibility

- [x] **TEST-01**: A visible "TESTSEITE" banner appears on every reader page when test mode is active
- [x] **TEST-02**: A visible "TESTSEITE" banner appears on every CMS/admin page when test mode is active

### Deployment

- [ ] **DEPLOY-01**: App deploys to Railway with a shareable public URL
- [ ] **DEPLOY-02**: PostgreSQL database provisioned on Railway with Prisma migrations applied
- [ ] **DEPLOY-03**: All test behaviors gated by single `NEXT_PUBLIC_IS_TEST_SITE` environment variable

### Production Safety

- [x] **SAFETY-01**: AdSense script tags do not load when test mode is active

## Future Requirements

None — this is a focused deployment milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| HTTP Basic Auth on test site | Adds complexity, breaks cron jobs and RSS feeds |
| Separate repository for test | Same codebase, env-var gated is simpler |
| Test-specific database schema | Same schema, separate PostgreSQL instance on Railway |
| Custom domain for test | Railway's `*.up.railway.app` domain is sufficient for sharing |
| Watermark overlay | TESTSEITE banner is sufficient visual signal |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEO-01 | Phase 22 | Complete |
| SEO-02 | Phase 22 | Complete |
| SEO-03 | Phase 22 | Complete |
| TEST-01 | Phase 22 | Complete |
| TEST-02 | Phase 22 | Complete |
| DEPLOY-01 | Phase 23 | Pending |
| DEPLOY-02 | Phase 23 | Pending |
| DEPLOY-03 | Phase 23 | Pending |
| SAFETY-01 | Phase 22 | Complete |

**Coverage:**
- v1.2 requirements: 9 total
- Mapped to phases: 9
- Satisfied: 6
- Pending: 3 (DEPLOY-01, DEPLOY-02, DEPLOY-03 → Phase 23)
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after roadmap creation*
