import { describe, it } from 'vitest'

describe('sitemap', () => {
  it.todo('includes homepage URL with priority 1.0')
  it.todo('includes /impressum URL')
  it.todo('includes /bezirk/[slug] URLs for all 13 Bezirke')
  it.todo('includes /artikel/[publicId]/[slug] URLs for published articles')
  it.todo('article URLs use lastModified from publishedAt')
})
