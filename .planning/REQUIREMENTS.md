# Requirements: Wurzelwelt v3.0 — The Modern Archivist

**Defined:** 2026-04-01
**Core Value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.

## v3.0 Requirements

Requirements for "The Modern Archivist" design system overhaul. Each maps to roadmap phases.

### Design Tokens & Foundation

- [x] **TOKN-01**: Site uses MD3-style color token system (Ink #071806, Parchment #FCF9EF, Slate #50606F, Aged Wood #230E08) with ~30 semantic surface/container variants
- [ ] **TOKN-02**: No visible borders on any reader-facing component — sections separated by tonal background shifts and negative space only
- [ ] **TOKN-03**: Border radii use 0.125rem (default) and 0.25rem (lg) throughout — no rounded corners
- [x] **TOKN-04**: Vertical spacing follows 3:5 ratio rhythm (1rem horizontal → 1.7rem vertical)
- [x] **TOKN-05**: Glassmorphism surface tokens defined via color-mix() for nav and overlays
- [x] **TOKN-06**: All shadows use tinted on-surface color, never pure black

### Shell Components

- [ ] **SHEL-01**: Bottom nav uses glassmorphism (85% opacity + backdrop-blur) with top-border active indicator
- [ ] **SHEL-02**: Bottom nav icons updated (auto_stories, forest, face_5, book_2) with filled active state
- [ ] **SHEL-03**: Dark editorial footer with Wurzelwelt branding, navigation columns, and Impressum/Kontakt links
- [ ] **SHEL-04**: Header shows hamburger menu + left-aligned serif "Wurzelwelt" on mobile
- [ ] **SHEL-05**: Header shows desktop navigation links (Archive, Forest, Guide, Library) on wider screens

### Homepage

- [ ] **HOME-01**: Topmeldung hero includes "VOLLSTÄNDIGEN ARTIKEL LESEN" CTA button with gradient overlay
- [ ] **HOME-02**: MascotGreeting restyled as "Wurzel sagt..." tonal box (not speech bubble)
- [ ] **HOME-03**: Weather widget displays current temperature and conditions for user's selected Bezirk via Open-Meteo API
- [ ] **HOME-04**: "Frag den Wurzelmann" card with dark green background links to region selector
- [ ] **HOME-05**: "Das Grüne der Woche" themed section displays nature/environment-tagged articles
- [ ] **HOME-06**: Homepage sections use tonal background alternation per the Archivist palette

### Article Detail

- [ ] **ARTC-01**: Article body displays drop cap on first paragraph
- [ ] **ARTC-02**: Blockquotes styled with large serif italic typography and tonal dividers
- [ ] **ARTC-03**: Sidebar shows article metadata (author/source, reading time, share button)
- [ ] **ARTC-04**: Article header uses "Archival Header" pattern with overlapping title on image

### Search & Discovery

- [ ] **SRCH-01**: Search page restyled with Archivist color tokens and editorial typography

### CMS Admin

- [ ] **CMS-01**: Admin pages restyled with Archivist color tokens (Ink/Parchment/Slate)
- [ ] **CMS-02**: Admin can assign "Grüne der Woche" theme tag to articles

## Future Requirements

### Engagement

- **ENGM-01**: Reader can bookmark/save articles
- **ENGM-02**: Reader can share articles via native share API
- **ENGM-03**: Reader profile page with saved content

### Moderation

- **MODR-01**: User can report content
- **MODR-02**: Admin can view reported content
- **MODR-03**: Admin can ban/remove content

## Out of Scope

| Feature | Reason |
|---------|--------|
| SVG choropleth map for region selector | Anti-feature per research — maintenance burden, accessibility issues, low mobile usability |
| Animated backdrop-filter transitions | Performance killer on mobile — static blur only per research |
| `@tailwindcss/typography` plugin | Incompatible with Tailwind v4 per research — use native first-letter: variant |
| `initial-letter` CSS property | Firefox unsupported — use float-based drop cap fallback |
| Geolocation API for weather | GDPR friction — use Mein Bezirk localStorage selection instead |
| Dark mode | Not part of Archivist identity — warm parchment is the brand |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOKN-01 | Phase 33 | Complete (Plan 33-01) |
| TOKN-02 | Phase 33 | Pending |
| TOKN-03 | Phase 33 | Pending |
| TOKN-04 | Phase 33 | Complete (Plan 33-01) |
| TOKN-05 | Phase 33 | Complete (Plan 33-01) |
| TOKN-06 | Phase 33 | Complete (Plan 33-01) |
| SHEL-01 | Phase 34 | Pending |
| SHEL-02 | Phase 34 | Pending |
| SHEL-03 | Phase 34 | Pending |
| SHEL-04 | Phase 34 | Pending |
| SHEL-05 | Phase 34 | Pending |
| HOME-01 | Phase 35 | Pending |
| HOME-02 | Phase 35 | Pending |
| HOME-03 | Phase 35 | Pending |
| HOME-04 | Phase 35 | Pending |
| HOME-05 | Phase 35 | Pending |
| HOME-06 | Phase 35 | Pending |
| ARTC-01 | Phase 36 | Pending |
| ARTC-02 | Phase 36 | Pending |
| ARTC-03 | Phase 36 | Pending |
| ARTC-04 | Phase 36 | Pending |
| SRCH-01 | Phase 37 | Pending |
| CMS-01 | Phase 37 | Pending |
| CMS-02 | Phase 37 | Pending |

**Coverage:**
- v3.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after Plan 33-01 completion (TOKN-01, TOKN-04, TOKN-05, TOKN-06 marked complete)*
