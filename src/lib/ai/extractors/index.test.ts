/**
 * Unit tests for extractArticleText dispatcher + extractorRegistry.
 *
 * Requirements:
 *   AIPL-06 — Source-typed extractors produce clean LLM-input text.
 */
import { describe, it, expect } from 'vitest'
import { extractArticleText, extractorRegistry } from './index'

describe('extractorRegistry', () => {
  it('exposes OTS_AT as a function', () => {
    expect(typeof extractorRegistry['OTS_AT']).toBe('function')
  })

  it('exposes RSS as a function', () => {
    expect(typeof extractorRegistry['RSS']).toBe('function')
  })

  it('does NOT register MANUAL (intentional default-fallback)', () => {
    expect(extractorRegistry['MANUAL']).toBeUndefined()
  })
})

describe('extractArticleText', () => {
  it('dispatches OTS_AT to extractOts (returns title + body, strips metadata)', () => {
    const rawPayload = {
      TITEL: 'Brand in Graz',
      TEXT: 'Ein Brand in der Grazer Innenstadt wurde gelöscht.',
      EMITTENT: 'Feuerwehr Graz',
      OTSKEY: 'OTS9999',
    }

    const output = extractArticleText('OTS_AT', rawPayload)

    expect(output).toContain('Brand in Graz')
    expect(output).toContain('Innenstadt')
    expect(output).not.toContain('OTS9999')
    expect(output).not.toContain('EMITTENT')
  })

  it('dispatches RSS to extractRss (returns title + description)', () => {
    const rawPayload = {
      title: 'Headline',
      description: 'Story body text.',
      guid: 'feed-1',
    }

    const output = extractArticleText('RSS', rawPayload)

    expect(output).toBe('Headline\n\nStory body text.')
  })

  it('MANUAL falls through to default [title, content].join("\\n\\n")', () => {
    const output = extractArticleText('MANUAL', { irrelevant: 'data' }, 'T', 'C')

    expect(output).toBe('T\n\nC')
  })

  it('default fallback drops empty/undefined title or content cleanly', () => {
    const output = extractArticleText('MANUAL', null, undefined, 'only-content')

    expect(output).toBe('only-content')
  })

  it('default fallback handles missing content arg', () => {
    const output = extractArticleText('MANUAL', null, 'only-title', undefined)

    expect(output).toBe('only-title')
  })
})
