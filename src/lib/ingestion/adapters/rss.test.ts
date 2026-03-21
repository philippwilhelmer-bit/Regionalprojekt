import { describe, it } from 'vitest'
// import { rssAdapter } from './rss'  // uncomment when implemented

describe('rssAdapter (RSS 2.0)', () => {
  it.todo('parses RSS 2.0 fixture into RawItem array with title, body, externalId')
  it.todo('falls back externalId to link when guid is absent')
  it.todo('falls back externalId to contentHash when both guid and link are absent')
})

describe('rssAdapter (Atom 1.0)', () => {
  it.todo('parses Atom 1.0 fixture into RawItem array')
  it.todo('maps atom:id to externalId')
})
