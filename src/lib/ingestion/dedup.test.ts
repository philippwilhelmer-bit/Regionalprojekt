import { describe, it } from 'vitest'
// import { isDuplicate, computeContentHash } from './dedup'  // uncomment when implemented

describe('computeContentHash', () => {
  it.todo('returns consistent hash for same title+body regardless of whitespace variation')
  it.todo('returns different hash for different content')
})

describe('isDuplicate', () => {
  it.todo('returns true for article with same source + externalId (fast path)')
  it.todo('returns true for article with same contentHash but different source (cross-source dedup)')
  it.todo('returns false for article with unique contentHash and unique externalId')
})
