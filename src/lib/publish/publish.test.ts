/**
 * Publish Service Tests — PUB-01
 *
 * Tests for publishArticles(): status-flip logic, backlog counting, DI pattern.
 *
 * Uses pgLite in-memory DB injected via DI overload.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { publishArticles } from './publish'

let db: PrismaClient

beforeEach(async () => {
  db = await createTestDb()
  await cleanDb(db)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('publishArticles()', () => {
  it('flips all WRITTEN articles to PUBLISHED with publishedAt set to now', async () => {
    // Seed 3 WRITTEN articles
    await db.article.createMany({
      data: [
        { externalId: 'art-1', title: 'Article 1', source: 'OTS_AT', status: 'WRITTEN' },
        { externalId: 'art-2', title: 'Article 2', source: 'OTS_AT', status: 'WRITTEN' },
        { externalId: 'art-3', title: 'Article 3', source: 'OTS_AT', status: 'WRITTEN' },
      ],
    })

    const result = await publishArticles(db)

    expect(result.articlesPublished).toBe(3)
    expect(result.reviewBacklog).toBe(0)

    // Verify all 3 are now PUBLISHED with publishedAt set
    const published = await db.article.findMany({ where: { status: 'PUBLISHED' } })
    expect(published).toHaveLength(3)
    for (const article of published) {
      expect(article.publishedAt).not.toBeNull()
    }
  })

  it('does NOT publish REVIEW articles', async () => {
    // Seed 2 WRITTEN + 1 REVIEW
    await db.article.createMany({
      data: [
        { externalId: 'art-1', title: 'Article 1', source: 'OTS_AT', status: 'WRITTEN' },
        { externalId: 'art-2', title: 'Article 2', source: 'OTS_AT', status: 'WRITTEN' },
        { externalId: 'art-3', title: 'Article 3', source: 'OTS_AT', status: 'REVIEW' },
      ],
    })

    const result = await publishArticles(db)

    expect(result.articlesPublished).toBe(2)
    expect(result.reviewBacklog).toBe(1)

    // REVIEW article is unchanged
    const reviewArticle = await db.article.findUnique({ where: { externalId: 'art-3' } })
    expect(reviewArticle?.status).toBe('REVIEW')
    expect(reviewArticle?.publishedAt).toBeNull()
  })

  it('returns reviewBacklog count equal to number of REVIEW articles and emits REVIEW_BACKLOG warn', async () => {
    await db.article.createMany({
      data: [
        { externalId: 'art-1', title: 'Article 1', source: 'OTS_AT', status: 'REVIEW' },
        { externalId: 'art-2', title: 'Article 2', source: 'OTS_AT', status: 'REVIEW' },
      ],
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await publishArticles(db)

    expect(result.articlesPublished).toBe(0)
    expect(result.reviewBacklog).toBe(2)
    expect(warnSpy).toHaveBeenCalledWith({ type: 'REVIEW_BACKLOG', count: 2 })
  })

  it('returns articlesPublished = 0 when no WRITTEN articles exist', async () => {
    const result = await publishArticles(db)

    expect(result.articlesPublished).toBe(0)
    expect(result.reviewBacklog).toBe(0)
  })

  it('uses injected PrismaClient when provided (DI path)', async () => {
    // Seed 1 WRITTEN article via the injected db
    await db.article.create({
      data: { externalId: 'art-di', title: 'DI Article', source: 'OTS_AT', status: 'WRITTEN' },
    })

    // Call with explicit DI client
    const result = await publishArticles(db)

    expect(result.articlesPublished).toBe(1)

    // Confirm it used the injected db (article is published in that db)
    const article = await db.article.findUnique({ where: { externalId: 'art-di' } })
    expect(article?.status).toBe('PUBLISHED')
    expect(article?.publishedAt).not.toBeNull()
  })
})
