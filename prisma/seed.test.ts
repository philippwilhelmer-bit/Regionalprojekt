/**
 * Tests for the config-driven seed script (prisma/seed.ts)
 *
 * Requirements:
 *   CONF-01 — Platform deployable for any Bundesland by changing a single config file
 *   CONF-02 — Steiermark deployment ships with all 13 regions pre-configured
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../src/test/setup-db'
import type { PrismaClient } from '@prisma/client'
import { seedBezirke } from './seed'

describe('Config-driven seed (CONF-01 + CONF-02)', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
  })

  it('seeding with steiermark config produces exactly 13 Bezirk rows (CONF-01 + CONF-02)', async () => {
    await seedBezirke(prisma, 'steiermark')
    const count = await prisma.bezirk.count()
    expect(count).toBe(13)
  })

  it('each Bezirk row has a unique slug, a non-empty name, and at least 1 gemeindeSynonym (CONF-02)', async () => {
    await seedBezirke(prisma, 'steiermark')
    const bezirke = await prisma.bezirk.findMany()

    const slugs = bezirke.map((b) => b.slug)
    const uniqueSlugs = new Set(slugs)
    expect(uniqueSlugs.size).toBe(bezirke.length)

    for (const bezirk of bezirke) {
      expect(bezirk.slug).toBeTruthy()
      expect(bezirk.name).toBeTruthy()
      expect(bezirk.gemeindeSynonyms.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('seeding with a mock config where bundesland is NOT steiermark produces 0 Bezirk rows (CONF-01 config-driven mechanic)', async () => {
    await seedBezirke(prisma, 'tirol')
    const count = await prisma.bezirk.count()
    expect(count).toBe(0)
  })
})

describe('seedSources', () => {
  // import { seedSources } from './seed'  // uncomment when implemented
  it.todo('inserts Source rows for the given bundesland on first run')
  it.todo('re-running seed produces no duplicate Source rows (idempotent upsert by url)')
  it.todo('only seeds sources for the given bundesland — other bundesland sources are untouched')
  it.todo('seedSources called after seedBezirke — existing Bezirk rows are unaffected')
})
