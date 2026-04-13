/**
 * Location extraction module for Regionalprojekt.
 *
 * MAP-01: extractLocation — regex-based extraction using Steiermark Bezirk names and synonyms.
 * CMS-02: llmLocationFallback — Haiku LLM fallback when regex finds nothing.
 *
 * Requirements: MAP-01, CMS-02
 */
import type Anthropic from '@anthropic-ai/sdk'
import { steiermarkBezirke } from '../../../prisma/seed-data/bezirke'

// ---------------------------------------------------------------------------
// Build flat list of all recognizable place names from bezirke seed data
// ---------------------------------------------------------------------------

// Flat list of all names and synonyms from bezirke seed data
const ALL_PLACE_NAMES: string[] = steiermarkBezirke.flatMap((b) => [b.name, ...b.gemeindeSynonyms])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ---------------------------------------------------------------------------
// GEOCODING_QUERY_OVERRIDE
//
// Maps Bezirk display names (and problematic synonyms) to clean queries for
// Nominatim. Applied in geocode.ts before constructing the HTTP URL.
// ---------------------------------------------------------------------------

export const GEOCODING_QUERY_OVERRIDE: Record<string, string> = {
  'Graz (Stadt)': 'Graz',
  'Graz-Umgebung': 'Graz-Umgebung',
  'Bruck-Mürzzuschlag': 'Bruck an der Mur',
  'Bruck-Muerzzuschlag': 'Bruck an der Mur',
  'Hartberg-Fürstenfeld': 'Hartberg',
  'Hartberg-Fuerstenfeld': 'Hartberg',
  'Murtal': 'Judenburg',
  'Südoststeiermark': 'Feldbach',
  'Suedoststeiermark': 'Feldbach',
  'Voitsberg': 'Voitsberg',
}

// ---------------------------------------------------------------------------
// extractLocation (MAP-01)
//
// Scans text for Bezirk names and gemeindeSynonyms. Sorts by string length
// descending so longer/more-specific names are matched first (e.g.
// "Graz-Umgebung" before "Graz").
// ---------------------------------------------------------------------------

export function extractLocation(text: string): string | null {
  // Sort by string length descending — longest match wins
  const sorted = [...ALL_PLACE_NAMES].sort((a, b) => b.length - a.length)

  for (const name of sorted) {
    // Use word boundary at start only when name starts with a word character.
    // Use lookbehind/lookahead to handle names with non-word chars (e.g. "Graz (Stadt)").
    const escaped = escapeRegex(name)
    // Leading boundary: require non-word char or start-of-string before first word char
    const leading = /^\w/.test(name) ? '(?<![\\w])' : ''
    // Trailing boundary: require non-word char or end-of-string after last char
    const trailing = /\w$/.test(name) ? '(?![\\w])' : '(?=$|\\s|[^\\w]|.)'
    const regex = new RegExp(`${leading}${escaped}${trailing}`, 'i')
    if (regex.test(text)) {
      // Return the canonical casing from the seed data
      return name
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// llmLocationFallback (CMS-02)
//
// Called only when extractLocation returns null. Uses claude-haiku to extract
// the most specific Austrian place name from the article text.
// Returns null on short text, LLM error, or when LLM has no place.
// ---------------------------------------------------------------------------

export async function llmLocationFallback(
  client: Anthropic,
  articleText: string
): Promise<string | null> {
  // Guard: skip if text too short to contain meaningful geographic content
  if (articleText.length < 100) return null

  try {
    const response = await (client.messages.create as Function)({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      system:
        'Extract the single most specific Austrian place name from the article text. ' +
        'Return a JSON object with a "location" field containing the place name string, ' +
        'or null if no Austrian place is mentioned.',
      messages: [{ role: 'user', content: articleText }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { location: { type: ['string', 'null'] } },
            required: ['location'],
            additionalProperties: false,
          },
        },
      },
    } as any) // output_config is a project-local non-standard extension — same cast as step1-tag.ts

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null

    const parsed = JSON.parse((textBlock as { text: string }).text) as { location: string | null }
    return parsed.location ?? null
  } catch {
    return null
  }
}
