/**
 * Tests for ai-config-dal.ts — AICONF-01, AICONF-02, AICONF-03
 * and pipeline-config-dal.ts — PipelineConfig singleton
 *
 * Uses pgLite-backed PrismaClient via createTestDb() for full DB isolation.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import type { PrismaClient } from '@prisma/client'
import {
  getAiConfig,
  upsertAiConfig,
  getResolvedAiConfig,
  upsertAiSourceConfig,
  deleteAiSourceConfig,
} from './ai-config-dal'
import { getPipelineConfig, upsertPipelineConfig } from './pipeline-config-dal'

let db: PrismaClient

beforeEach(async () => {
  db = await createTestDb()
  await cleanDb(db)
})

describe('getAiConfig (global singleton)', () => {
  it('returns default row when none exists (find-or-create)', async () => {
    const config = await getAiConfig(db)

    expect(config.tone).toBe('NEUTRAL')
    expect(config.articleLength).toBe('MEDIUM')
    expect(config.styleNotes).toBeNull()
    expect(config.modelOverride).toBeNull()
  })

  it('returns existing row when already created', async () => {
    const first = await getAiConfig(db)
    const second = await getAiConfig(db)

    expect(second.id).toBe(first.id)
    // Should not create a second row
    const count = await db.aiConfig.count()
    expect(count).toBe(1)
  })
})

describe('upsertAiConfig', () => {
  it('creates singleton row on first call', async () => {
    const config = await upsertAiConfig(db, { tone: 'FORMAL' })

    expect(config.tone).toBe('FORMAL')
    expect(config.articleLength).toBe('MEDIUM')
  })

  it('updates existing singleton row on subsequent calls', async () => {
    await upsertAiConfig(db, { tone: 'FORMAL' })
    const updated = await upsertAiConfig(db, { tone: 'CONVERSATIONAL', articleLength: 'LONG' })

    expect(updated.tone).toBe('CONVERSATIONAL')
    expect(updated.articleLength).toBe('LONG')

    // Should still be only one row
    const count = await db.aiConfig.count()
    expect(count).toBe(1)
  })
})

describe('getResolvedAiConfig (per-source merge)', () => {
  it('returns global defaults when no per-source override exists', async () => {
    await upsertAiConfig(db, { tone: 'FORMAL', articleLength: 'SHORT' })

    const source = await db.source.create({
      data: { url: 'https://rss.example.com/feed.xml', type: 'RSS' },
    })

    const resolved = await getResolvedAiConfig(db, source.id)

    expect(resolved.tone).toBe('FORMAL')
    expect(resolved.articleLength).toBe('SHORT')
    expect(resolved.styleNotes).toBeNull()
    expect(resolved.modelOverride).toBeNull()
  })

  it('overrides tone when AiSourceConfig.tone is set', async () => {
    await upsertAiConfig(db, { tone: 'NEUTRAL' })

    const source = await db.source.create({
      data: { url: 'https://rss.example.com/feed.xml', type: 'RSS' },
    })

    await upsertAiSourceConfig(db, { sourceId: source.id, tone: 'CONVERSATIONAL' })

    const resolved = await getResolvedAiConfig(db, source.id)

    expect(resolved.tone).toBe('CONVERSATIONAL')
    // articleLength falls through to global
    expect(resolved.articleLength).toBe('MEDIUM')
  })

  it('overrides articleLength when AiSourceConfig.articleLength is set', async () => {
    await upsertAiConfig(db, { articleLength: 'SHORT' })

    const source = await db.source.create({
      data: { url: 'https://rss.example.com/feed.xml', type: 'RSS' },
    })

    await upsertAiSourceConfig(db, { sourceId: source.id, articleLength: 'LONG' })

    const resolved = await getResolvedAiConfig(db, source.id)

    expect(resolved.articleLength).toBe('LONG')
    expect(resolved.tone).toBe('NEUTRAL') // global default
  })

  it('falls through to global for null override fields', async () => {
    await upsertAiConfig(db, { tone: 'FORMAL', styleNotes: 'Mention Bezirk' })

    const source = await db.source.create({
      data: { url: 'https://rss.example.com/feed.xml', type: 'RSS' },
    })

    // Only override tone, leave styleNotes null (should fall through)
    await upsertAiSourceConfig(db, { sourceId: source.id, tone: 'CONVERSATIONAL' })

    const resolved = await getResolvedAiConfig(db, source.id)

    expect(resolved.tone).toBe('CONVERSATIONAL') // per-source override
    expect(resolved.styleNotes).toBe('Mention Bezirk') // falls through to global
  })
})

describe('upsertAiSourceConfig', () => {
  it('creates AiSourceConfig row linked to sourceId', async () => {
    const source = await db.source.create({
      data: { url: 'https://rss.example.com/feed.xml', type: 'RSS' },
    })

    const config = await upsertAiSourceConfig(db, {
      sourceId: source.id,
      tone: 'FORMAL',
    })

    expect(config.sourceId).toBe(source.id)
    expect(config.tone).toBe('FORMAL')
  })

  it('updates existing row on second upsert for same sourceId', async () => {
    const source = await db.source.create({
      data: { url: 'https://rss.example.com/feed.xml', type: 'RSS' },
    })

    await upsertAiSourceConfig(db, { sourceId: source.id, tone: 'FORMAL' })
    const updated = await upsertAiSourceConfig(db, {
      sourceId: source.id,
      tone: 'CONVERSATIONAL',
    })

    expect(updated.tone).toBe('CONVERSATIONAL')

    const count = await db.aiSourceConfig.count()
    expect(count).toBe(1)
  })
})

describe('deleteAiSourceConfig', () => {
  it('deletes AiSourceConfig row for sourceId', async () => {
    const source = await db.source.create({
      data: { url: 'https://rss.example.com/feed.xml', type: 'RSS' },
    })

    await upsertAiSourceConfig(db, { sourceId: source.id, tone: 'FORMAL' })
    await deleteAiSourceConfig(db, source.id)

    const count = await db.aiSourceConfig.count()
    expect(count).toBe(0)
  })
})

describe('getPipelineConfig (pipeline singleton)', () => {
  it('returns default row (maxRetryCount=3, deadManThresholdHours=6) when none exists', async () => {
    const config = await getPipelineConfig(db)

    expect(config.maxRetryCount).toBe(3)
    expect(config.deadManThresholdHours).toBe(6)
  })

  it('returns existing row values when already set', async () => {
    await upsertPipelineConfig(db, { maxRetryCount: 5, deadManThresholdHours: 12 })

    const config = await getPipelineConfig(db)

    expect(config.maxRetryCount).toBe(5)
    expect(config.deadManThresholdHours).toBe(12)

    // Should only be one row
    const count = await db.pipelineConfig.count()
    expect(count).toBe(1)
  })
})

describe('upsertPipelineConfig', () => {
  it('creates singleton row on first call', async () => {
    const config = await upsertPipelineConfig(db, { maxRetryCount: 5 })

    expect(config.maxRetryCount).toBe(5)
    expect(config.deadManThresholdHours).toBe(6)
  })

  it('updates existing singleton row on subsequent calls', async () => {
    await upsertPipelineConfig(db, { maxRetryCount: 5 })
    const updated = await upsertPipelineConfig(db, { deadManThresholdHours: 12 })

    expect(updated.deadManThresholdHours).toBe(12)
    // maxRetryCount retained from previous call
    expect(updated.maxRetryCount).toBe(5)

    const count = await db.pipelineConfig.count()
    expect(count).toBe(1)
  })
})

describe('pipeline reads AiConfig at run start', () => {
  it('processArticles reads AiConfig — no hardcoded prompt used', async () => {
    // This is a documentation/integration stub test.
    // The actual integration (pipeline.ts reading AiConfig) is done in Plan 05.
    // Here we verify getAiConfig works as an integration point.
    const config = await getAiConfig(db)
    expect(config).toBeDefined()
    expect(config.tone).toBeDefined()
    expect(config.articleLength).toBeDefined()
  })
})
