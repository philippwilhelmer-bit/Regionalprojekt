/**
 * Article data access layer.
 *
 * Production usage (no-arg client): functions use the singleton from src/lib/prisma.ts.
 * Test usage: pass a pgLite-backed PrismaClient as the first argument.
 */
import type { Article, ArticleStatus, Prisma, PrismaClient } from '@prisma/client'
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

// ─── Homepage editorial query functions ──────────────────────────────────────

/**
 * Returns the article flagged as isFeatured=true (PUBLISHED only).
 * Falls back to the newest published article when none are featured.
 * Returns null when there are no published articles.
 */
export async function getFeaturedArticle(): Promise<ArticleWithBezirke | null>
export async function getFeaturedArticle(client: PrismaClient): Promise<ArticleWithBezirke | null>
export async function getFeaturedArticle(
  clientOrVoid?: PrismaClient
): Promise<ArticleWithBezirke | null> {
  const db = clientOrVoid !== undefined && typeof clientOrVoid === 'object' && '$connect' in clientOrVoid
    ? clientOrVoid
    : defaultPrisma

  const include = { bezirke: { include: { bezirk: true } } }

  // Try to get the featured article first
  const featured = await db.article.findFirst({
    where: { status: 'PUBLISHED', isFeatured: true },
    include,
  })
  if (featured) return featured

  // Fall back to newest published article
  return db.article.findFirst({
    where: { status: 'PUBLISHED' },
    include,
    orderBy: { publishedAt: 'desc' },
  })
}

/**
 * Returns isPinned=true articles (PUBLISHED only), filtered by bezirkIds when provided.
 * isStateWide articles are always included when a bezirkIds filter is applied.
 * Falls back to newest published articles when none are pinned.
 */
export async function getPinnedArticles(options?: {
  bezirkIds?: number[]
  limit?: number
}): Promise<ArticleWithBezirke[]>
export async function getPinnedArticles(
  client: PrismaClient,
  options?: { bezirkIds?: number[]; limit?: number }
): Promise<ArticleWithBezirke[]>
export async function getPinnedArticles(
  clientOrOptions?: PrismaClient | { bezirkIds?: number[]; limit?: number },
  options?: { bezirkIds?: number[]; limit?: number }
): Promise<ArticleWithBezirke[]> {
  let db: PrismaClient
  let opts: { bezirkIds?: number[]; limit?: number }

  if (clientOrOptions !== undefined && clientOrOptions !== null && typeof clientOrOptions === 'object' && '$connect' in clientOrOptions) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as { bezirkIds?: number[]; limit?: number }) ?? {}
  }

  const { bezirkIds, limit = 10 } = opts
  const include = { bezirke: { include: { bezirk: true } } }

  const where: Prisma.ArticleWhereInput = {
    status: 'PUBLISHED',
    isPinned: true,
    ...(bezirkIds !== undefined && bezirkIds.length > 0
      ? {
          OR: [
            { bezirke: { some: { bezirkId: { in: bezirkIds } } } },
            { isStateWide: true },
          ],
        }
      : {}),
  }

  const pinned = await db.article.findMany({
    where,
    include,
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })

  if (pinned.length > 0) return pinned

  // Fallback: return newest published articles
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
    include,
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
}

/**
 * Returns true when at least one PUBLISHED article has isEilmeldung=true.
 */
export async function hasEilmeldung(): Promise<boolean>
export async function hasEilmeldung(client: PrismaClient): Promise<boolean>
export async function hasEilmeldung(
  clientOrVoid?: PrismaClient
): Promise<boolean> {
  const db = clientOrVoid !== undefined && typeof clientOrVoid === 'object' && '$connect' in clientOrVoid
    ? clientOrVoid
    : defaultPrisma

  const count = await db.article.count({
    where: { status: 'PUBLISHED', isEilmeldung: true },
  })
  return count > 0
}

/**
 * Returns PUBLISHED articles where isFeatured=false, ordered by isPinned desc then publishedAt desc.
 * Default limit is 60.
 */
export async function listArticlesForHomepage(options?: {
  limit?: number
}): Promise<ArticleWithBezirke[]>
export async function listArticlesForHomepage(
  client: PrismaClient,
  options?: { limit?: number }
): Promise<ArticleWithBezirke[]>
export async function listArticlesForHomepage(
  clientOrOptions?: PrismaClient | { limit?: number },
  options?: { limit?: number }
): Promise<ArticleWithBezirke[]> {
  let db: PrismaClient
  let opts: { limit?: number }

  if (clientOrOptions !== undefined && clientOrOptions !== null && typeof clientOrOptions === 'object' && '$connect' in clientOrOptions) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as { limit?: number }) ?? {}
  }

  const { limit = 60 } = opts

  return db.article.findMany({
    where: { status: 'PUBLISHED', isFeatured: false },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  })
}

// TODO: If article count exceeds 200, consider server-side search API
/**
 * Returns all PUBLISHED articles with bezirke included, ordered by publishedAt desc.
 * Intended for client-side full-text search — exhaustive, no featured/pinned filter.
 * Default limit is 200.
 */
export async function listArticlesForSearch(options?: {
  limit?: number
}): Promise<ArticleWithBezirke[]>
export async function listArticlesForSearch(
  client: PrismaClient,
  options?: { limit?: number }
): Promise<ArticleWithBezirke[]>
export async function listArticlesForSearch(
  clientOrOptions?: PrismaClient | { limit?: number },
  options?: { limit?: number }
): Promise<ArticleWithBezirke[]> {
  let db: PrismaClient
  let opts: { limit?: number }

  if (clientOrOptions !== undefined && clientOrOptions !== null && typeof clientOrOptions === 'object' && '$connect' in clientOrOptions) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as { limit?: number }) ?? {}
  }

  const { limit = 200 } = opts

  return db.article.findMany({
    where: { status: 'PUBLISHED' },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: [{ publishedAt: 'desc' }],
    take: limit,
  })
}

/**
 * Pure function — no DB access.
 *
 * Groups an array of ArticleWithBezirke by the slug of each article's first tagged bezirk.
 * Articles with isStateWide=true appear in every group.
 * Articles with no bezirke are excluded entirely.
 *
 * Returns: Map<bezirkSlug, { name: string, articles: ArticleWithBezirke[] }>
 */
export function groupArticlesByBezirk(
  articles: ArticleWithBezirke[]
): Map<string, { name: string; articles: ArticleWithBezirke[] }> {
  const result = new Map<string, { name: string; articles: ArticleWithBezirke[] }>()

  // Collect all non-statewide articles that have at least one bezirk
  const withBezirk = articles.filter(
    (a) => !a.isStateWide && a.bezirke.length > 0
  )
  const stateWide = articles.filter((a) => a.isStateWide)

  // Build groups from normal articles (first bezirk determines the group)
  for (const article of withBezirk) {
    const firstEntry = article.bezirke[0]
    const { slug, name } = firstEntry.bezirk

    if (!result.has(slug)) {
      result.set(slug, { name, articles: [] })
    }
    result.get(slug)!.articles.push(article)
  }

  // Add stateWide articles to every existing group
  for (const [, group] of result) {
    group.articles.push(...stateWide)
  }

  return result
}

// ─── Bezirk-specific article queries ─────────────────────────────────────────

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

  // Return only PUBLISHED articles tagged to this Bezirk OR Steiermark-weit articles
  return db.article.findMany({
    where: {
      status: 'PUBLISHED',
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
