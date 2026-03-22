/**
 * Dead-Man Monitor Tests — PUB-03
 *
 * Tests for checkDeadMan(): alert firing logic, threshold config, NULL handling.
 *
 * Uses pgLite in-memory DB injected via DI overload.
 * Uses vi.spyOn(console, 'warn') for alert verification.
 * Threshold now read from PipelineConfig DB row (configurable via CMS, default 6h).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { checkDeadMan } from './dead-man'

let db: PrismaClient

beforeEach(async () => {
  db = await createTestDb()
  await cleanDb(db)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('checkDeadMan()', () => {
  it('emits DEAD_MAN_ALERT console.warn when publishedAt silence exceeds threshold', async () => {
    // Seed an article published 7 hours ago; default threshold = 6
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)
    await db.article.create({
      data: {
        source: 'OTS_AT',
        status: 'PUBLISHED',
        publishedAt: sevenHoursAgo,
      },
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await checkDeadMan(db)

    expect(warnSpy).toHaveBeenCalledOnce()
    const call = warnSpy.mock.calls[0][0] as { type: string; lastPublishedAt: string; silenceDurationHours: number }
    expect(call.type).toBe('DEAD_MAN_ALERT')
    expect(call.lastPublishedAt).toBe(sevenHoursAgo.toISOString())
    expect(call.silenceDurationHours).toBe(7)
  })

  it('does NOT emit alert when last publishedAt is within threshold window', async () => {
    // Seed an article published 1 hour ago; default threshold = 6
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    await db.article.create({
      data: {
        source: 'OTS_AT',
        status: 'PUBLISHED',
        publishedAt: oneHourAgo,
      },
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await checkDeadMan(db)

    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('emits DEAD_MAN_ALERT when no articles have been published yet (NULL publishedAt)', async () => {
    // No articles in DB — aggregate returns null
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await checkDeadMan(db)

    expect(warnSpy).toHaveBeenCalledOnce()
    const call = warnSpy.mock.calls[0][0] as { type: string; lastPublishedAt: null; silenceDurationHours: number }
    expect(call.type).toBe('DEAD_MAN_ALERT')
    expect(call.lastPublishedAt).toBeNull()
    // silenceDurationHours should be very large (Infinity rounded or capped)
    expect(call.silenceDurationHours).toBeGreaterThan(1000)
  })

  it('reads threshold from PipelineConfig DB row — alert fires when threshold is lower', async () => {
    // Set threshold = 2 in DB, publishedAt = 3 hours ago → should alert
    await db.pipelineConfig.create({
      data: { maxRetryCount: 3, deadManThresholdHours: 2 },
    })

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
    await db.article.create({
      data: {
        source: 'OTS_AT',
        status: 'PUBLISHED',
        publishedAt: threeHoursAgo,
      },
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await checkDeadMan(db)

    expect(warnSpy).toHaveBeenCalledOnce()
    const call = warnSpy.mock.calls[0][0] as { type: string; silenceDurationHours: number }
    expect(call.type).toBe('DEAD_MAN_ALERT')
    expect(call.silenceDurationHours).toBe(3)
  })

  it('uses default threshold of 6 hours from PipelineConfig when no row exists', async () => {
    // No PipelineConfig in DB — getPipelineConfig creates default with 6h
    // Publish 5 hours ago — within default 6h threshold → no alert
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000)
    await db.article.create({
      data: {
        source: 'OTS_AT',
        status: 'PUBLISHED',
        publishedAt: fiveHoursAgo,
      },
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await checkDeadMan(db)

    // 5 hours < 6 hours default → no alert
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
