/**
 * Tests for the config-driven seed script (prisma/seed.ts)
 *
 * RED state: seed.ts and the config-driven seeding mechanism don't exist yet.
 * These tests will pass once Plan 03 implements seed.ts and bundesland.config.ts.
 *
 * Requirements:
 *   CONF-01 — Platform deployable for any Bundesland by changing a single config file
 *   CONF-02 — Steiermark deployment ships with all 13 regions pre-configured
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../src/test/setup-db'
import type { PrismaClient } from '@prisma/client'

describe('Config-driven seed (CONF-01 + CONF-02)', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
  })

  it.todo(
    'seeding with a config that has only 1 region produces exactly 1 Bezirk row (CONF-01 config-driven mechanic)'
  )

  it.todo(
    'seeding with the steiermark config produces 13 Bezirke (CONF-01 + CONF-02)'
  )
})
