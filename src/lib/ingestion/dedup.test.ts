/**
 * Tests for the deduplication service.
 *
 * Requirements:
 *   ING-03 — Duplicate detection: same source+externalId (fast path) and same contentHash (cross-source)
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import type { PrismaClient } from '@prisma/client'
import { computeContentHash, isDuplicate } from './dedup'

describe('computeContentHash', () => {
  it('returns consistent hash for same title+body regardless of case variation', () => {
    const h1 = computeContentHash('Hello World', 'body text')
    const h2 = computeContentHash('hello world', 'body text')
    expect(h1).toBe(h2)
  })

  it('returns consistent hash for same content with leading/trailing whitespace', () => {
    const h1 = computeContentHash('  title  ', '  body  ')
    const h2 = computeContentHash('title', 'body')
    expect(h1).toBe(h2)
  })

  it('returns different hash for different body content', () => {
    const h1 = computeContentHash('title', 'a')
    const h2 = computeContentHash('title', 'b')
    expect(h1).not.toBe(h2)
  })
})

describe('isDuplicate', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
  })

  it('returns true for article with same source + externalId (fast path)', async () => {
    await prisma.article.create({
      data: {
        externalId: 'ots-123',
        source: 'OTS_AT',
        title: 'Test Article',
        content: 'Test body',
        contentHash: computeContentHash('Test Article', 'Test body'),
      },
    })

    const result = await isDuplicate(prisma, 'OTS_AT', 'ots-123', 'any-hash')
    expect(result).toBe(true)
  })

  it('returns true for article with same contentHash but different source (cross-source dedup)', async () => {
    const hash = computeContentHash('Shared content', 'Same body text')
    await prisma.article.create({
      data: {
        externalId: 'rss-456',
        source: 'RSS',
        title: 'Shared content',
        content: 'Same body text',
        contentHash: hash,
      },
    })

    const result = await isDuplicate(prisma, 'OTS_AT', 'ots-new-id', hash)
    expect(result).toBe(true)
  })

  it('returns false for article with unique contentHash and unique externalId', async () => {
    const result = await isDuplicate(
      prisma,
      'OTS_AT',
      'completely-new-id',
      computeContentHash('Brand new title', 'Brand new body')
    )
    expect(result).toBe(false)
  })
})
