/**
 * Tests for the Source DAL.
 *
 * Requirements:
 *   ING-04 — Health tracking: consecutiveFailures, healthStatus transitions
 *   ING-05 — Adapter plug-in contract: listSources supports enabled filter
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import type { PrismaClient } from '@prisma/client'
import { listSources } from './sources'

describe('listSources', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
  })

  it('returns only enabled sources when enabled=true filter passed', async () => {
    await prisma.source.create({
      data: { type: 'OTS_AT', url: 'https://ots.at/api', enabled: true },
    })
    await prisma.source.create({
      data: { type: 'RSS', url: 'https://example.com/rss', enabled: false },
    })

    const result = await listSources(prisma, { enabled: true })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('OTS_AT')
  })

  it('returns all sources when no filter passed', async () => {
    await prisma.source.create({
      data: { type: 'OTS_AT', url: 'https://ots.at/api', enabled: true },
    })
    await prisma.source.create({
      data: { type: 'RSS', url: 'https://example.com/rss', enabled: false },
    })

    const result = await listSources(prisma)
    expect(result).toHaveLength(2)
  })
})

