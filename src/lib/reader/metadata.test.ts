import { describe, it } from 'vitest'

describe('buildArticleMetadata', () => {
  it.todo('uses seoTitle as og:title when present')
  it.todo('falls back to title when seoTitle is null')
  it.todo('uses metaDescription as og:description when present')
  it.todo('canonical URL uses /artikel/[publicId]/[slug] form')
  it.todo('og:type is "article"')
  it.todo('returns empty object when article not found')
})
