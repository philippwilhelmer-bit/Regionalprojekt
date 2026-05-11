/**
 * Unit tests for extractRss — pulls title + description/summary/content from rawPayload.
 *
 * Requirements:
 *   AIPL-06 — Source-typed extractors produce clean LLM-input text.
 */
import { describe, it, expect } from 'vitest'
import { extractRss } from './rss'

describe('extractRss', () => {
  it('pulls title + description for RSS shape', () => {
    const rawPayload = {
      title: 'Skiweltcup',
      description: 'In Schladming hat heute der alpine Skiweltcup begonnen.',
      guid: 'abc',
      link: 'https://x',
      pubDate: 'Mon, 15 Mar 2026 10:00:00 +0000',
    }

    const output = extractRss(rawPayload)

    expect(output).toBe('Skiweltcup\n\nIn Schladming hat heute der alpine Skiweltcup begonnen.')
  })

  it('pulls title + summary for Atom shape', () => {
    const rawPayload = {
      title: 'Skiweltcup',
      summary: 'In Schladming hat heute der alpine Skiweltcup begonnen.',
      id: 'urn:abc',
      links: [{ href: 'https://x', rel: 'alternate' }],
      published: '2026-03-15T10:00:00Z',
    }

    const output = extractRss(rawPayload)

    expect(output).toContain('Skiweltcup')
    expect(output).toContain('In Schladming hat heute der alpine Skiweltcup begonnen.')
  })

  it('falls back to content when neither description nor summary is present', () => {
    const rawPayload = {
      title: 'Foo',
      content: 'Body',
    }

    const output = extractRss(rawPayload)

    expect(output).toBe('Foo\n\nBody')
  })

  it('uses title/content args when rawPayload is empty', () => {
    const output = extractRss({}, 'T', 'C')

    expect(output).toBe('T\n\nC')
  })

  it('tolerates non-object rawPayload', () => {
    expect(() => extractRss(null)).not.toThrow()
    expect(() => extractRss(undefined)).not.toThrow()
    expect(() => extractRss('plain string')).not.toThrow()
    expect(extractRss(null, 'T', 'C')).toBe('T\n\nC')
  })
})
