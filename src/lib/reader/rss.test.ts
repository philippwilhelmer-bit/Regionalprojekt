import { describe, it } from 'vitest'

describe('generateBezirkRssFeed', () => {
  it.todo('returns valid RSS XML string with correct content-type shape')
  it.todo('each item link is the canonical /artikel/[publicId]/[slug] URL')
  it.todo('includes full article content in description field (not excerpt)')
  it.todo('limits to 20 most recent published articles')
  it.todo('returns steiermark-weit feed when slug is "steiermark"')
})
