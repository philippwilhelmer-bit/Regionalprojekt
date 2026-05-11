/**
 * OTS press-release extractor — produces clean LLM-input text from an OTS detail rawPayload.
 *
 * Requirements:
 *   AIPL-06 — Strip source metadata at the extractor boundary so the prompt's
 *             "no Presseformular-Floskeln" rule is not the only line of defense.
 *
 * Behavior:
 *   - Reads only TITEL + the CANDIDATE_BODY_FIELDS (TEXT/BODY/INHALT/text/body) from rawPayload.
 *   - Reads only the title field (TITEL) and the body candidates; all sender,
 *     timestamp, slug, and link fields are never read at all.
 *   - Strips contact-block lines (Rückfragen, Pressekontakt, Aussender, Tel:, E-Mail, OTS<digits>, Kommandant …)
 *     from the extracted body via line-level regex.
 *   - Falls back to (title, content) args when rawPayload has no usable body field or is not an object.
 *
 * The CANDIDATE_BODY_FIELDS list mirrors src/lib/ingestion/adapters/ots-at.ts:27 verbatim.
 * Keep both lists in sync; Plan 45 may extract a shared constant.
 */

/**
 * Candidate body field names — mirrored from src/lib/ingestion/adapters/ots-at.ts:27.
 * Order matters: first non-empty string match wins.
 */
const CANDIDATE_BODY_FIELDS = ['TEXT', 'BODY', 'INHALT', 'text', 'body'] as const

/**
 * Per-line regex patterns that mark a body line as metadata/contact-block.
 * A line matching any pattern is removed before the body is joined back.
 */
const OTS_METADATA_LINE_PATTERNS: RegExp[] = [
  /Rückfragen\s*&?\s*Kontakt/i,
  /Pressekontakt/i,
  /^\s*Aussender/i,
  /Tel\.?:\s*[+0-9 ()/\-]+/i,
  /E-?Mail:?\s*\S+@\S+/i,
  /\bOTS\d{3,4}\b/i,
  /^\s*Kommandant\b/i,
  /^\s*(?:https?:\/\/|www\.)\S+/i,
]

function extractBodyFromOts(detail: Record<string, unknown>): string {
  for (const field of CANDIDATE_BODY_FIELDS) {
    const value = detail[field]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return ''
}

function stripMetadataLines(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line) => !OTS_METADATA_LINE_PATTERNS.some((re) => re.test(line)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Extract clean article text from an OTS detail rawPayload.
 *
 * @param rawPayload — the OTS detail JSON object (from /api/detail).
 * @param title — fallback title when rawPayload.TITEL is missing/empty.
 * @param content — fallback body when no CANDIDATE_BODY_FIELDS match.
 * @returns "${title}\n\n${cleanedBody}" with metadata stripped, or the
 *          [title, content].filter(Boolean).join('\n\n') fallback.
 */
export function extractOts(rawPayload: unknown, title?: string, content?: string): string {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return [title, content].filter(Boolean).join('\n\n')
  }

  const detail = rawPayload as Record<string, unknown>
  const otsTitle = typeof detail['TITEL'] === 'string' ? detail['TITEL'] : (title ?? '')
  const rawBody = extractBodyFromOts(detail) || (content ?? '')
  const cleanedBody = stripMetadataLines(rawBody)

  return [otsTitle, cleanedBody].filter(Boolean).join('\n\n').trim()
}
