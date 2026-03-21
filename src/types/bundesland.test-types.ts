/**
 * Type-level tests for BundeslandConfig.
 *
 * These are compile-time assertions — they are verified by `npx tsc --noEmit`.
 * None of this runs at runtime.
 *
 * BEHAVIORS TESTED:
 * 1. bundesland.config.ts satisfies BundeslandConfig — tsc exits 0 (CONF-01, AD-02)
 * 2. A config missing adZones causes a TypeScript compile error (AD-02 type coverage)
 * 3. An invalid adZone id like 'sidebar' causes a TypeScript compile error (AD-02 type safety)
 */

import type { BundeslandConfig, AdZone } from './bundesland'

// --- Behavior 1: Valid config satisfies BundeslandConfig ---
// This will pass once bundesland.config.ts exists and is correct.
// We import it here to verify tsc does not error on the satisfies clause.
// (Tested indirectly — the actual satisfies is in bundesland.config.ts)

// --- Behavior 2: adZones is required ---
// @ts-expect-error — missing adZones must cause a compile error
const _missingAdZones: BundeslandConfig = {
  bundesland: 'test',
  siteName: 'Test Site',
  tagline: 'Test',
  branding: {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    logoPath: '/logo.svg',
    impressum: {
      publisherName: 'Test',
      address: 'Test',
      email: 'test@test.com',
    },
  },
  features: { ads: false, rss: false },
  // adZones intentionally omitted — @ts-expect-error above must fire
}

// --- Behavior 3: Invalid adZone id causes compile error ---
// Casting via satisfies triggers error on the invalid id property.
const _invalidAdZoneId: AdZone = {
  // @ts-expect-error — 'sidebar' is not in the literal union 'hero' | 'between-articles' | 'article-detail'
  id: 'sidebar',
  envVar: 'SOME_VAR',
  enabled: true,
}

// Suppress unused variable warnings
void _missingAdZones
void _invalidAdZoneId
