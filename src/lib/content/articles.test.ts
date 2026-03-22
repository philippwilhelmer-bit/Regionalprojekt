/**
 * Tests for the Article content data access layer (articles.ts)
 *
 * Covers: listArticles(), getArticleById(), getArticlesByBezirk(),
 * getArticleByPublicId(), listArticlesReader()
 * including isStateWide (Steiermark-weit) article logic.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { seedBezirke } from '../../../prisma/seed'
import type { PrismaClient } from '@prisma/client'
import { listArticles, getArticleById, getArticlesByBezirk, getArticleByPublicId, listArticlesReader } from './articles'

describe('Article DAL', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
    await seedBezirke(prisma, 'steiermark')
  })

  beforeEach(async () => {
    // Only clean articles and junctions between tests — keep Bezirke seeded
    await prisma.articleBezirk.deleteMany()
    await prisma.article.deleteMany()
  })

  it('listArticles() returns empty array when no articles exist — no crash', async () => {
    const articles = await listArticles(prisma)
    expect(articles).toEqual([])
  })

  it('getArticleById() returns null when article does not exist — no crash', async () => {
    const article = await getArticleById(prisma, 99999)
    expect(article).toBeNull()
  })

  it('listArticles() returns existing articles', async () => {
    await prisma.article.create({
      data: {
        source: 'OTS_AT',
        title: 'Test Article',
        status: 'FETCHED',
        isStateWide: false,
      },
    })
    const articles = await listArticles(prisma)
    expect(articles).toHaveLength(1)
    expect(articles[0].title).toBe('Test Article')
  })

  it("getArticlesByBezirk('liezen') returns only articles tagged to that Bezirk", async () => {
    const liezen = await prisma.bezirk.findUnique({ where: { slug: 'liezen' } })
    expect(liezen).not.toBeNull()

    const liezener = await prisma.article.create({
      data: {
        source: 'OTS_AT',
        title: 'Liezen News',
        status: 'FETCHED',
        isStateWide: false,
        bezirke: { create: [{ bezirkId: liezen!.id }] },
      },
    })

    await prisma.article.create({
      data: {
        source: 'OTS_AT',
        title: 'Graz News',
        status: 'FETCHED',
        isStateWide: false,
        bezirke: {
          create: [
            {
              bezirkId: (await prisma.bezirk.findUnique({ where: { slug: 'graz' } }))!.id,
            },
          ],
        },
      },
    })

    const articles = await getArticlesByBezirk(prisma, 'liezen')
    const ids = articles.map((a) => a.id)
    expect(ids).toContain(liezener.id)
    // Graz-only article should NOT appear
    expect(ids).not.toContain(
      expect.not.objectContaining({ title: 'Liezen News' })
    )
    expect(articles.find((a) => a.title === 'Graz News')).toBeUndefined()
  })

  it("getArticlesByBezirk() includes isStateWide articles in any Bezirk feed", async () => {
    const stateWide = await prisma.article.create({
      data: {
        source: 'OTS_AT',
        title: 'Steiermark-weit News',
        status: 'FETCHED',
        isStateWide: true,
      },
    })

    const articles = await getArticlesByBezirk(prisma, 'weiz')
    const ids = articles.map((a) => a.id)
    expect(ids).toContain(stateWide.id)
  })
})

describe('getArticleByPublicId', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
    await seedBezirke(prisma, 'steiermark')
  })

  beforeEach(async () => {
    await prisma.articleBezirk.deleteMany()
    await prisma.article.deleteMany()
  })

  it('returns article with bezirke when publicId matches', async () => {
    const created = await prisma.article.create({
      data: {
        source: 'OTS_AT',
        title: 'Test Article',
        status: 'PUBLISHED',
        isStateWide: false,
        publicId: 'abc123',
      },
    })
    const result = await getArticleByPublicId(prisma, 'abc123')
    expect(result).not.toBeNull()
    expect(result!.id).toBe(created.id)
    expect(result!.bezirke).toEqual([])
  })

  it('returns null when publicId not found', async () => {
    const result = await getArticleByPublicId(prisma, 'notexist')
    expect(result).toBeNull()
  })
})

describe('listArticlesReader', () => {
  let prisma: PrismaClient
  let liezerId: number
  let grazId: number

  beforeAll(async () => {
    prisma = await createTestDb()
    await seedBezirke(prisma, 'steiermark')
    const liezen = await prisma.bezirk.findUnique({ where: { slug: 'liezen' } })
    const graz = await prisma.bezirk.findUnique({ where: { slug: 'graz' } })
    liezerId = liezen!.id
    grazId = graz!.id
  })

  beforeEach(async () => {
    await prisma.articleBezirk.deleteMany()
    await prisma.article.deleteMany()
  })

  it('filters to PUBLISHED status only', async () => {
    await prisma.article.create({
      data: { source: 'OTS_AT', title: 'Published', status: 'PUBLISHED', isStateWide: false, publicId: 'pub1' },
    })
    await prisma.article.create({
      data: { source: 'OTS_AT', title: 'Fetched', status: 'FETCHED', isStateWide: false, publicId: 'ftc1' },
    })
    await prisma.article.create({
      data: { source: 'OTS_AT', title: 'Written', status: 'WRITTEN', isStateWide: false, publicId: 'wrt1' },
    })
    const results = await listArticlesReader(prisma)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Published')
  })

  it('sorts pinned articles first, then featured, then by publishedAt desc', async () => {
    const now = new Date()
    const older = new Date(now.getTime() - 10000)
    const oldest = new Date(now.getTime() - 20000)

    await prisma.article.create({
      data: { source: 'OTS_AT', title: 'Regular', status: 'PUBLISHED', isStateWide: false, publicId: 'reg1', publishedAt: now },
    })
    await prisma.article.create({
      data: { source: 'OTS_AT', title: 'Featured', status: 'PUBLISHED', isStateWide: false, isFeatured: true, publicId: 'feat1', publishedAt: older },
    })
    await prisma.article.create({
      data: { source: 'OTS_AT', title: 'Pinned', status: 'PUBLISHED', isStateWide: false, isPinned: true, publicId: 'pin1', publishedAt: oldest },
    })

    const results = await listArticlesReader(prisma)
    const titles = results.map((a) => a.title)
    expect(titles[0]).toBe('Pinned')
    expect(titles[1]).toBe('Featured')
    expect(titles[2]).toBe('Regular')
  })

  it('filters by single bezirkId when provided', async () => {
    await prisma.article.create({
      data: {
        source: 'OTS_AT', title: 'Liezen Article', status: 'PUBLISHED', isStateWide: false, publicId: 'liez1',
        bezirke: { create: [{ bezirkId: liezerId }] },
      },
    })
    await prisma.article.create({
      data: {
        source: 'OTS_AT', title: 'Graz Article', status: 'PUBLISHED', isStateWide: false, publicId: 'graz1',
        bezirke: { create: [{ bezirkId: grazId }] },
      },
    })

    const results = await listArticlesReader(prisma, { bezirkIds: [liezerId] })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Liezen Article')
  })

  it('filters by multiple bezirkIds when array provided', async () => {
    await prisma.article.create({
      data: {
        source: 'OTS_AT', title: 'Liezen Article', status: 'PUBLISHED', isStateWide: false, publicId: 'liez2',
        bezirke: { create: [{ bezirkId: liezerId }] },
      },
    })
    await prisma.article.create({
      data: {
        source: 'OTS_AT', title: 'Graz Article', status: 'PUBLISHED', isStateWide: false, publicId: 'graz2',
        bezirke: { create: [{ bezirkId: grazId }] },
      },
    })

    const results = await listArticlesReader(prisma, { bezirkIds: [liezerId, grazId] })
    const titles = results.map((a) => a.title)
    expect(titles).toContain('Liezen Article')
    expect(titles).toContain('Graz Article')
  })

  it('returns all Steiermark articles when no bezirkId filter', async () => {
    await prisma.article.create({
      data: {
        source: 'OTS_AT', title: 'Liezen Article', status: 'PUBLISHED', isStateWide: false, publicId: 'liez3',
        bezirke: { create: [{ bezirkId: liezerId }] },
      },
    })
    await prisma.article.create({
      data: {
        source: 'OTS_AT', title: 'Graz Article', status: 'PUBLISHED', isStateWide: false, publicId: 'graz3',
        bezirke: { create: [{ bezirkId: grazId }] },
      },
    })

    const results = await listArticlesReader(prisma)
    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  it('supports limit and offset pagination', async () => {
    // Create 10 published articles
    for (let i = 1; i <= 10; i++) {
      await prisma.article.create({
        data: {
          source: 'OTS_AT', title: `Article ${i}`, status: 'PUBLISHED', isStateWide: false,
          publicId: `page-art-${i}`,
          publishedAt: new Date(Date.now() - i * 1000),
        },
      })
    }
    const page1 = await listArticlesReader(prisma, { limit: 5, offset: 0 })
    const page2 = await listArticlesReader(prisma, { limit: 5, offset: 5 })
    expect(page1).toHaveLength(5)
    expect(page2).toHaveLength(5)
    // No overlap between pages
    const page1Ids = page1.map((a) => a.id)
    const page2Ids = page2.map((a) => a.id)
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false)
  })
})
