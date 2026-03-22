/**
 * Publish Service Tests — PUB-01
 *
 * Wave 0: stubs only. Implementations filled in Plan 02.
 */
import { describe, it } from 'vitest'
// import { publishArticles } from './publish'

describe('publishArticles()', () => {
  it.todo('flips all WRITTEN articles to PUBLISHED with publishedAt set to now')
  it.todo('does NOT publish REVIEW articles')
  it.todo('returns reviewBacklog count equal to number of REVIEW articles')
  it.todo('returns articlesPublished = 0 when no WRITTEN articles exist')
  it.todo('uses injected PrismaClient when provided (DI path)')
})
