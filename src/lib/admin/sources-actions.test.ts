/**
 * Tests for sources-actions.ts — CMS-04
 * Source management: createSource, updateSource, listSourcesAdmin
 *
 * Uses pgLite-backed PrismaClient via createTestDb() for full DB isolation.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import type { PrismaClient } from '@prisma/client'
import {
  createSourceDb,
  updateSourceDb,
  listSourcesAdmin,
} from './sources-actions'

let db: PrismaClient

beforeEach(async () => {
  db = await createTestDb()
  await cleanDb(db)
})

describe('createSource', () => {
  it('creates Source row with url, type, and default healthFailureThreshold=3', async () => {
    const source = await createSourceDb(db, {
      url: 'https://rss.example.com/feed.xml',
      type: 'RSS',
    })

    expect(source.url).toBe('https://rss.example.com/feed.xml')
    expect(source.type).toBe('RSS')
    expect(source.enabled).toBe(true)
    expect(source.healthStatus).toBe('OK')
    expect(source.healthFailureThreshold).toBe(3)
  })

  it('creates Source row with custom pollIntervalMinutes', async () => {
    const source = await createSourceDb(db, {
      url: 'https://ots.example.com/feed',
      type: 'OTS_AT',
      pollIntervalMinutes: 30,
    })

    expect(source.pollIntervalMinutes).toBe(30)
  })
})

describe('updateSource', () => {
  it('updates pollIntervalMinutes and healthFailureThreshold', async () => {
    const source = await createSourceDb(db, {
      url: 'https://rss.example.com/feed.xml',
      type: 'RSS',
    })

    const updated = await updateSourceDb(db, {
      id: source.id,
      pollIntervalMinutes: 60,
      healthFailureThreshold: 5,
    })

    expect(updated.pollIntervalMinutes).toBe(60)
    expect(updated.healthFailureThreshold).toBe(5)
  })

  it('sets enabled=false when disabling', async () => {
    const source = await createSourceDb(db, {
      url: 'https://rss.example.com/feed.xml',
      type: 'RSS',
    })

    const updated = await updateSourceDb(db, {
      id: source.id,
      enabled: false,
    })

    expect(updated.enabled).toBe(false)
  })
})

describe('listSourcesAdmin', () => {
  it('returns sources with latest IngestionRun stats and FAILED+ERROR article counts', async () => {
    const source = await createSourceDb(db, {
      url: 'https://rss.example.com/feed.xml',
      type: 'RSS',
    })

    // Create two ingestion runs — listSourcesAdmin should return the latest one
    await db.ingestionRun.create({
      data: { sourceId: source.id, itemsFound: 10, itemsNew: 5 },
    })
    await db.ingestionRun.create({
      data: { sourceId: source.id, itemsFound: 20, itemsNew: 8 },
    })

    // Create articles with various statuses
    await db.article.create({
      data: { source: 'RSS', status: 'FAILED', title: 'Failed article' },
    })
    await db.article.create({
      data: { source: 'RSS', status: 'ERROR', title: 'Error article' },
    })
    await db.article.create({
      data: { source: 'RSS', status: 'PUBLISHED', title: 'Published article' },
    })

    const results = await listSourcesAdmin(db)

    expect(results).toHaveLength(1)
    const result = results[0]
    expect(result.id).toBe(source.id)
    expect(result.healthStatus).toBe('OK')
    // Latest ingestion run (itemsFound=20, itemsNew=8)
    expect(result.latestRun).not.toBeNull()
    expect(result.latestRun?.itemsFound).toBe(20)
    expect(result.latestRun?.itemsNew).toBe(8)
    // FAILED + ERROR count for RSS type
    expect(result.failedErrorCount).toBe(2)
  })

  it('returns empty latestRun and zero failedErrorCount when no runs or articles', async () => {
    await createSourceDb(db, {
      url: 'https://rss.example.com/feed.xml',
      type: 'RSS',
    })

    const results = await listSourcesAdmin(db)

    expect(results).toHaveLength(1)
    expect(results[0].latestRun).toBeNull()
    expect(results[0].failedErrorCount).toBe(0)
  })
})
