# Requirements: Regionalprojekt (Wurzelwelt)

**Defined:** 2026-03-28
**Core Value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.

## v2.0 Requirements

Requirements for the Wurzelwelt rebrand. Each maps to roadmap phases.

### Design System

- [x] **DS-01**: Tailwind theme updated with new color palette (primary #1B2D18, secondary #4A5D23, accent #9F411E, background #FCF9EF, text #071806, surface hierarchy)
- [x] **DS-02**: Plus Jakarta Sans loaded and configured as body/UI font, replacing Inter and Work Sans
- [x] **DS-03**: Material Symbols Rounded variant replaces current Material Symbols
- [ ] **DS-04**: All 1px borders replaced with tonal background shifts for section separation
- [ ] **DS-05**: Minimum 0.75rem corner radius on all interactive elements (no sharp corners)
- [ ] **DS-06**: Organic spacing scale applied (1.7rem mobile gutters, 4rem section gaps)
- [ ] **DS-07**: CTA buttons use gradient from primary to primary-container at 135°, fully rounded

### Brand Identity

- [ ] **BRAND-01**: All references to "Ennstal Aktuell" renamed to "Wurzelwelt" across reader and admin
- [ ] **BRAND-02**: Wurzelmann mascot image added to repo and served from public assets

### Reader Components

- [ ] **COMP-01**: WurzelAppBar with centered "WURZELWELT" in bold uppercase Newsreader + Wurzelmann avatar
- [ ] **COMP-02**: MascotGreeting speech-bubble card with "Wurzelmann sagt:" quote on tonal background
- [ ] **COMP-03**: Topmeldung hero with full-bleed image and dark gradient overlay behind headline
- [ ] **COMP-04**: RegionalEditorialCard with full-width aspect-video images, Newsreader headlines, uppercase Jakarta Sans labels
- [ ] **COMP-05**: Prioritized "Mein Bezirk" section with larger featured card
- [ ] **COMP-06**: WurzelNavBar 4-tab bottom nav with rounded Material Symbols icons
- [ ] **COMP-07**: Homepage sections separated by tonal background shifts (#FCF9EF / #F6F4EA alternation)

### Article Detail

- [ ] **ART-01**: Article detail page restyled with new color palette, typography, and spacing

### CMS Admin

- [ ] **CMS-01**: CMS admin pages restyled with Wurzelwelt brand colors, typography, and design tokens

## Future Requirements

Deferred past v2.0.

### Wurzelmann Interaction

- **WURZEL-01**: Central Wurzelmann action button in bottom nav with dedicated functionality
- **WURZEL-02**: Wurzelmann interactive page/experience

## Out of Scope

| Feature | Reason |
|---------|--------|
| Central Wurzelmann FAB in bottom nav | Functionality still in design, deferred past v2.0 |
| New page layouts beyond homepage/article/search | Rebrand focuses on reskinning existing pages |
| Animation/motion design | Keep scope to visual tokens and components |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DS-01 | Phase 26 | Complete |
| DS-02 | Phase 26 | Complete |
| DS-03 | Phase 26 | Complete |
| DS-04 | Phase 26 | Pending |
| DS-05 | Phase 26 | Pending |
| DS-06 | Phase 26 | Pending |
| DS-07 | Phase 26 | Pending |
| BRAND-01 | Phase 26 | Pending |
| BRAND-02 | Phase 26 | Pending |
| COMP-01 | Phase 27 | Pending |
| COMP-06 | Phase 27 | Pending |
| COMP-02 | Phase 28 | Pending |
| COMP-03 | Phase 28 | Pending |
| COMP-04 | Phase 28 | Pending |
| COMP-05 | Phase 28 | Pending |
| COMP-07 | Phase 28 | Pending |
| ART-01 | Phase 29 | Pending |
| CMS-01 | Phase 30 | Pending |

**Coverage:**
- v2.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation (v2.0 phases 26-30)*
