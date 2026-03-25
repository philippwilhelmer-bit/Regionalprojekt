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
import { seedBezirke, seedSources } from './seed'
import { steiermarkSources } from './seed-data/sources'
import config from '../bundesland.config'

describe('Config-driven seed (CONF-01 + CONF-02)', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
  })

  it('seeding with steiermark config produces exactly config.regions.length Bezirk rows (CONF-01)', async () => {
    await seedBezirke(prisma, 'steiermark')
    const count = await prisma.bezirk.count()
    expect(count).toBe(config.regions.length)
  })

  it('each Bezirk row has a unique slug and a non-empty name (CONF-01)', async () => {
    await seedBezirke(prisma, 'steiermark')
    const bezirke = await prisma.bezirk.findMany()

    const slugs = bezirke.map((b) => b.slug)
    const uniqueSlugs = new Set(slugs)
    expect(uniqueSlugs.size).toBe(bezirke.length)

    for (const bezirk of bezirke) {
      expect(bezirk.slug).toBeTruthy()
      expect(bezirk.name).toBeTruthy()
    }
  })

  it('seeding with a mock config where bundesland is NOT steiermark produces 0 Bezirk rows (CONF-01 config-driven mechanic)', async () => {
    await seedBezirke(prisma, 'tirol')
    const count = await prisma.bezirk.count()
    expect(count).toBe(0)
  })
})

describe('seedSources', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
  })

  it('inserts Source rows for the given bundesland on first run', async () => {
    await seedSources(prisma, 'steiermark')
    const count = await prisma.source.count()
    expect(count).toBe(steiermarkSources.length)
  })

  it('re-running seed produces no duplicate Source rows (idempotent upsert by url)', async () => {
    await seedSources(prisma, 'steiermark')
    await seedSources(prisma, 'steiermark') // second run
    const count = await prisma.source.count()
    expect(count).toBe(steiermarkSources.length) // still same count, no duplicates
  })

  it('only seeds sources for the given bundesland — other bundesland sources are untouched', async () => {
    await seedSources(prisma, 'steiermark')
    const countBefore = await prisma.source.count()
    // Calling with a different bundesland that has no sources defined should add 0 rows
    await seedSources(prisma, 'unknown-bundesland')
    const countAfter = await prisma.source.count()
    expect(countAfter).toBe(countBefore)
  })

  it('seedSources called after seedBezirke — existing Bezirk rows are unaffected', async () => {
    await seedBezirke(prisma, 'steiermark')
    const bezirkCountBefore = await prisma.bezirk.count()
    await seedSources(prisma, 'steiermark')
    const bezirkCountAfter = await prisma.bezirk.count()
    // Bezirk rows must be unaffected by seeding sources
    expect(bezirkCountAfter).toBe(bezirkCountBefore)
    // And repeated source seeding must not throw
    await expect(seedSources(prisma, 'steiermark')).resolves.not.toThrow()
  })
})
