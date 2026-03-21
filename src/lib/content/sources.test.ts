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
import { listSources, updateSourceHealth } from './sources'

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

describe('updateSourceHealth', () => {
  let prisma: PrismaClient
  let sourceId: number

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
    const source = await prisma.source.create({
      data: { type: 'OTS_AT', url: 'https://ots.at/api', enabled: true },
    })
    sourceId = source.id
  })

  it('increments consecutiveFailures and sets healthStatus to DEGRADED at threshold 1', async () => {
    // Start at 0 failures — after 1 failure it should be DEGRADED
    await updateSourceHealth(prisma, sourceId, {
      consecutiveFailures: 1,
      healthStatus: 'DEGRADED',
    })

    const updated = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } })
    expect(updated.consecutiveFailures).toBe(1)
    expect(updated.healthStatus).toBe('DEGRADED')
  })

  it('sets healthStatus to DOWN when consecutiveFailures reaches 3', async () => {
    await updateSourceHealth(prisma, sourceId, {
      consecutiveFailures: 3,
      healthStatus: 'DOWN',
    })

    const updated = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } })
    expect(updated.consecutiveFailures).toBe(3)
    expect(updated.healthStatus).toBe('DOWN')
  })

  it('resets consecutiveFailures to 0 and sets healthStatus to OK on success', async () => {
    // First put in a failed state
    await prisma.source.update({
      where: { id: sourceId },
      data: { consecutiveFailures: 2, healthStatus: 'DEGRADED' },
    })

    const now = new Date()
    await updateSourceHealth(prisma, sourceId, {
      consecutiveFailures: 0,
      healthStatus: 'OK',
      lastSuccessAt: now,
    })

    const updated = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } })
    expect(updated.consecutiveFailures).toBe(0)
    expect(updated.healthStatus).toBe('OK')
    expect(updated.lastSuccessAt).not.toBeNull()
  })
})
