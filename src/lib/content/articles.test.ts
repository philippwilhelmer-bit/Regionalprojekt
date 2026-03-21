/**
 * Tests for the Article content data access layer (articles.ts)
 *
 * Covers: listArticles(), getArticleById(), getArticlesByBezirk()
 * including isStateWide (Steiermark-weit) article logic.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { seedBezirke } from '../../../prisma/seed'
import type { PrismaClient } from '@prisma/client'
import { listArticles, getArticleById, getArticlesByBezirk } from './articles'

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
