/**
 * Article data access layer.
 *
 * Production usage (no-arg client): functions use the singleton from src/lib/prisma.ts.
 * Test usage: pass a pgLite-backed PrismaClient as the first argument.
 */
import type { Article, ArticleStatus, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

export type ArticleWithBezirke = Article & {
  bezirke: {
    bezirk: {
      id: number
      slug: string
      name: string
      gemeindeSynonyms: string[]
      createdAt: Date
    }
    articleId: number
    bezirkId: number
    taggedAt: Date
  }[]
}

export async function listArticles(options?: {
  bezirkId?: number
  status?: ArticleStatus
  limit?: number
  offset?: number
}): Promise<ArticleWithBezirke[]>
export async function listArticles(
  client: PrismaClient,
  options?: {
    bezirkId?: number
    status?: ArticleStatus
    limit?: number
    offset?: number
  }
): Promise<ArticleWithBezirke[]>
export async function listArticles(
  clientOrOptions?:
    | PrismaClient
    | {
        bezirkId?: number
        status?: ArticleStatus
        limit?: number
        offset?: number
      },
  options?: {
    bezirkId?: number
    status?: ArticleStatus
    limit?: number
    offset?: number
  }
): Promise<ArticleWithBezirke[]> {
  let db: PrismaClient
  let opts: { bezirkId?: number; status?: ArticleStatus; limit?: number; offset?: number }

  if (clientOrOptions !== null && typeof clientOrOptions === 'object' && '$connect' in clientOrOptions) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as { bezirkId?: number; status?: ArticleStatus; limit?: number; offset?: number }) ?? {}
  }

  const { bezirkId, status, limit = 20, offset = 0 } = opts

  return db.article.findMany({
    where: {
      ...(bezirkId !== undefined
        ? { bezirke: { some: { bezirkId } } }
        : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: {
      bezirke: {
        include: { bezirk: true },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    skip: offset,
  })
}

export async function getArticleById(id: number): Promise<ArticleWithBezirke | null>
export async function getArticleById(client: PrismaClient, id: number): Promise<ArticleWithBezirke | null>
export async function getArticleById(
  clientOrId: PrismaClient | number,
  id?: number
): Promise<ArticleWithBezirke | null> {
  if (typeof clientOrId === 'number') {
    return defaultPrisma.article.findUnique({
      where: { id: clientOrId },
      include: { bezirke: { include: { bezirk: true } } },
    })
  }
  return clientOrId.article.findUnique({
    where: { id: id! },
    include: { bezirke: { include: { bezirk: true } } },
  })
}

export async function getArticleByPublicId(publicId: string): Promise<ArticleWithBezirke | null>
export async function getArticleByPublicId(
  client: PrismaClient,
  publicId: string
): Promise<ArticleWithBezirke | null>
export async function getArticleByPublicId(
  clientOrPublicId: PrismaClient | string,
  publicId?: string
): Promise<ArticleWithBezirke | null> {
  if (typeof clientOrPublicId === 'string') {
    return defaultPrisma.article.findUnique({
      where: { publicId: clientOrPublicId },
      include: { bezirke: { include: { bezirk: true } } },
    })
  }
  return clientOrPublicId.article.findUnique({
    where: { publicId: publicId! },
    include: { bezirke: { include: { bezirk: true } } },
  })
}

export async function listArticlesReader(options?: {
  bezirkIds?: number[]
  limit?: number
  offset?: number
}): Promise<ArticleWithBezirke[]>
export async function listArticlesReader(
  client: PrismaClient,
  options?: {
    bezirkIds?: number[]
    limit?: number
    offset?: number
  }
): Promise<ArticleWithBezirke[]>
export async function listArticlesReader(
  clientOrOptions?:
    | PrismaClient
    | {
        bezirkIds?: number[]
        limit?: number
        offset?: number
      },
  options?: {
    bezirkIds?: number[]
    limit?: number
    offset?: number
  }
): Promise<ArticleWithBezirke[]> {
  let db: PrismaClient
  let opts: { bezirkIds?: number[]; limit?: number; offset?: number }

  if (clientOrOptions !== null && typeof clientOrOptions === 'object' && '$connect' in clientOrOptions) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as { bezirkIds?: number[]; limit?: number; offset?: number }) ?? {}
  }

  const { bezirkIds, limit = 20, offset = 0 } = opts

  return db.article.findMany({
    where: {
      status: 'PUBLISHED',
      ...(bezirkIds !== undefined && bezirkIds.length > 0
        ? {
            OR: [
              { bezirke: { some: { bezirkId: { in: bezirkIds } } } },
              { isStateWide: true },
            ],
          }
        : {}),
    },
    include: {
      bezirke: {
        include: { bezirk: true },
      },
    },
    orderBy: [
      { isPinned: 'desc' },
      { isFeatured: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  })
}

export async function getArticlesByBezirk(
  bezirkSlug: string,
  options?: { limit?: number; offset?: number }
): Promise<ArticleWithBezirke[]>
export async function getArticlesByBezirk(
  client: PrismaClient,
  bezirkSlug: string,
  options?: { limit?: number; offset?: number }
): Promise<ArticleWithBezirke[]>
export async function getArticlesByBezirk(
  clientOrSlug: PrismaClient | string,
  slugOrOptions?: string | { limit?: number; offset?: number },
  options?: { limit?: number; offset?: number }
): Promise<ArticleWithBezirke[]> {
  let db: PrismaClient
  let bezirkSlug: string
  let opts: { limit?: number; offset?: number }

  if (typeof clientOrSlug === 'string') {
    db = defaultPrisma
    bezirkSlug = clientOrSlug
    opts = (slugOrOptions as { limit?: number; offset?: number }) ?? {}
  } else {
    db = clientOrSlug
    bezirkSlug = slugOrOptions as string
    opts = options ?? {}
  }

  const { limit = 20, offset = 0 } = opts

  // Resolve the bezirk by slug first
  const bezirk = await db.bezirk.findUnique({ where: { slug: bezirkSlug } })
  if (!bezirk) return []

  // Return articles tagged to this Bezirk OR Steiermark-weit articles
  return db.article.findMany({
    where: {
      OR: [
        // Tagged to this specific Bezirk
        { bezirke: { some: { bezirkId: bezirk.id } } },
        // Steiermark-weit articles appear in every Bezirk feed
        { isStateWide: true },
      ],
    },
    include: {
      bezirke: {
        include: { bezirk: true },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    skip: offset,
  })
}
