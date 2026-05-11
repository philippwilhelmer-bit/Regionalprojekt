/**
 * Unit tests for locextract.ts
 *
 * Covers MAP-01 (extractLocation regex) and CMS-02 (llmLocationFallback).
 *
 * AIPL-08: llmLocationFallback returns {location, inputTokens, outputTokens}
 * so callers can attribute fallback API spend to the PipelineRun totals only
 * when the fallback was actually invoked.
 */

import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { extractLocation, llmLocationFallback, GEOCODING_QUERY_OVERRIDE } from './locextract'

// ---------------------------------------------------------------------------
// extractLocation tests (MAP-01)
// ---------------------------------------------------------------------------

describe('extractLocation', () => {
  it('returns "Kapfenberg" for "Ein Brand in Kapfenberg"', () => {
    expect(extractLocation('Ein Brand in Kapfenberg')).toBe('Kapfenberg')
  })

  it('returns "Graz-Umgebung" for text containing "Graz-Umgebung" (not just "Graz")', () => {
    const result = extractLocation('Graz-Umgebung meldet neue Zahlen')
    expect(result).toBe('Graz-Umgebung')
  })

  it('matches "Graz (Stadt)" for text containing "Graz (Stadt)"', () => {
    const result = extractLocation('Bericht aus Graz (Stadt)')
    expect(result).toBe('Graz (Stadt)')
  })

  it('returns null for text with no Steiermark place (e.g. Berlin)', () => {
    expect(extractLocation('Politischer Bericht aus Berlin')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractLocation('')).toBeNull()
  })

  it('returns "Graz" for synonym match "Graz" when no longer name present', () => {
    expect(extractLocation('Ein Brand in Graz')).toBe('Graz')
  })

  it('is case-insensitive: matches "kapfenberg" (lowercase)', () => {
    expect(extractLocation('Nachrichten aus kapfenberg')).toBe('Kapfenberg')
  })

  it('matches synonyms like "Schladming"', () => {
    expect(extractLocation('Großes Event in Schladming')).toBe('Schladming')
  })

  it('returns null for text with only a non-Steiermark Austrian city like Wien', () => {
    expect(extractLocation('Politischer Bericht aus Wien')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// GEOCODING_QUERY_OVERRIDE tests
// ---------------------------------------------------------------------------

describe('GEOCODING_QUERY_OVERRIDE', () => {
  it('maps "Graz (Stadt)" to "Graz"', () => {
    expect(GEOCODING_QUERY_OVERRIDE['Graz (Stadt)']).toBe('Graz')
  })

  it('maps "Bruck-Mürzzuschlag" to "Bruck an der Mur"', () => {
    // Accept either version with or without umlaut
    const val = GEOCODING_QUERY_OVERRIDE['Bruck-Mürzzuschlag'] ?? GEOCODING_QUERY_OVERRIDE['Bruck-Muerzzuschlag']
    expect(val).toBe('Bruck an der Mur')
  })
})

// ---------------------------------------------------------------------------
// llmLocationFallback tests (CMS-02 + AIPL-08)
// ---------------------------------------------------------------------------

function makeMockClient(
  locationValue: string | null | undefined,
  throwError = false,
  usage: { input_tokens: number; output_tokens: number } = { input_tokens: 50, output_tokens: 10 },
): Anthropic {
  const create = throwError
    ? vi.fn().mockRejectedValue(new Error('API error'))
    : vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text:
              locationValue === undefined
                ? 'not json at all'
                : JSON.stringify({ location: locationValue }),
          },
        ],
        usage,
      })

  return { messages: { create } } as unknown as Anthropic
}

describe('llmLocationFallback (AIPL-08 return shape)', () => {
  it('returns {location: null, inputTokens: 0, outputTokens: 0} when text is shorter than 100 characters (guard fires before API call)', async () => {
    const client = makeMockClient('Graz')
    const result = await llmLocationFallback(client, 'short text')
    expect(result).toEqual({ location: null, inputTokens: 0, outputTokens: 0 })
    expect(client.messages.create as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
  })

  it('returns {location: "Leoben", inputTokens, outputTokens} on successful LLM extraction', async () => {
    const client = makeMockClient('Leoben', false, { input_tokens: 50, output_tokens: 10 })
    const text = 'a'.repeat(101)
    const result = await llmLocationFallback(client, text)
    expect(result).toEqual({ location: 'Leoben', inputTokens: 50, outputTokens: 10 })
  })

  it('returns {location: null, inputTokens, outputTokens} when LLM response has location: null (tokens were spent)', async () => {
    const client = makeMockClient(null, false, { input_tokens: 50, output_tokens: 10 })
    const text = 'a'.repeat(101)
    const result = await llmLocationFallback(client, text)
    expect(result).toEqual({ location: null, inputTokens: 50, outputTokens: 10 })
  })

  it('returns {location: null, inputTokens, outputTokens} when LLM response is malformed JSON (tokens were spent)', async () => {
    const client = makeMockClient(undefined, false, { input_tokens: 50, output_tokens: 10 }) // triggers non-JSON text
    const text = 'a'.repeat(101)
    const result = await llmLocationFallback(client, text)
    expect(result).toEqual({ location: null, inputTokens: 50, outputTokens: 10 })
  })

  it('returns {location: null, inputTokens: 0, outputTokens: 0} when LLM throws an error (no tokens charged)', async () => {
    const client = makeMockClient(null, true)
    const text = 'a'.repeat(101)
    const result = await llmLocationFallback(client, text)
    expect(result).toEqual({ location: null, inputTokens: 0, outputTokens: 0 })
  })

  it('calls messages.create with correct model and max_tokens', async () => {
    const client = makeMockClient('Graz')
    const text = 'a'.repeat(101)
    await llmLocationFallback(client, text)
    const createFn = client.messages.create as ReturnType<typeof vi.fn>
    expect(createFn).toHaveBeenCalledOnce()
    const callArg = createFn.mock.calls[0][0] as { model: string; max_tokens: number }
    expect(callArg.model).toBe('claude-haiku-4-5-20251001')
    expect(callArg.max_tokens).toBe(64)
  })

  it('defaults missing usage fields to 0 (defensive when SDK omits usage)', async () => {
    // Mock client whose usage object lacks input_tokens / output_tokens
    const create = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ location: 'Graz' }) }],
      usage: {}, // no fields
    })
    const client = { messages: { create } } as unknown as Anthropic
    const text = 'a'.repeat(101)
    const result = await llmLocationFallback(client, text)
    expect(result).toEqual({ location: 'Graz', inputTokens: 0, outputTokens: 0 })
  })
})
