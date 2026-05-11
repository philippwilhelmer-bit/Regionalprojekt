/**
 * Source-typed article-text extractor registry + dispatcher.
 *
 * Requirements:
 *   AIPL-06 — Replace whole-object payload serialization in the LLM pipeline with a
 *             source-aware extractor that drops metadata at the boundary.
 *
 * Design:
 *   Mirrors src/lib/ingestion/adapters/registry.ts — keyed off the ArticleSource
 *   Prisma enum, MANUAL intentionally absent (falls through to the default
 *   [title, content].join('\n\n') concatenation).
 *
 * Wiring into pipeline.ts happens in Plan 43-03 — this file is the
 * self-contained package; nothing here imports the pipeline.
 */
import type { ArticleSource } from '@prisma/client'
import { extractOts } from './ots'
import { extractRss } from './rss'

export type ExtractorFn = (rawPayload: unknown, title?: string, content?: string) => string

export const extractorRegistry: Partial<Record<ArticleSource, ExtractorFn>> = {
  OTS_AT: extractOts,
  RSS: extractRss,
  // MANUAL: intentionally absent — MANUAL articles already have clean title/content;
  //         the default fallback below joins them with a blank line.
}

/**
 * Dispatch to the source-specific extractor or fall back to a default concatenation.
 *
 * @param source — Prisma ArticleSource enum value.
 * @param rawPayload — the adapter's stored rawPayload (shape depends on source).
 * @param title — fallback / supplementary title.
 * @param content — fallback / supplementary body.
 * @returns clean LLM-input text. Never serializes the raw payload as a whole.
 */
export function extractArticleText(
  source: ArticleSource,
  rawPayload: unknown,
  title?: string,
  content?: string,
): string {
  const extractor = extractorRegistry[source]
  if (extractor) {
    return extractor(rawPayload, title, content)
  }
  return [title, content].filter(Boolean).join('\n\n')
}
