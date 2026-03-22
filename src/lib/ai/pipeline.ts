/**
 * AI Pipeline Orchestrator
 *
 * processArticles() wires Steps 1 and 2 with the circuit-breaker into
 * a single function that reads FETCHED articles, processes them end-to-end,
 * and records the run in PipelineRun.
 *
 * Requirements: AI-01, AI-02, AI-03, AI-04, AI-05, SEO-02
 *
 * DI pattern: zero-arg production path uses singleton PrismaClient;
 * injected-client path used in tests (duck-typed via '$connect' check,
 * same pattern as ingest.ts).
 *
 * Anthropic client is created via the _createAnthropicClient factory
 * (exported only for test overrides).
 */
import type { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { prisma as defaultPrisma } from '../prisma'
import { checkCostCircuitBreaker } from './circuit-breaker'
import { runStep1Tag } from './steps/step1-tag'
import { runStep2Write } from './steps/step2-write'
import { getPipelineConfig } from '../admin/pipeline-config-dal'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ProcessResult {
  articlesProcessed: number
  articlesWritten: number
  totalInputTokens: number
  totalOutputTokens: number
}

// ---------------------------------------------------------------------------
// Internal — exported only for test overrides
// ---------------------------------------------------------------------------

/**
 * Factory object used to create the Anthropic client once per run.
 * Tests can override _clientFactory.create before calling processArticles():
 *   pipeline._clientFactory.create = () => mockClient
 */
export const _clientFactory = {
  create: (): Anthropic => new Anthropic(),
}

/** @deprecated Use _clientFactory.create — kept for backward compat */
// eslint-disable-next-line prefer-const
export let _createAnthropicClient = (): Anthropic => _clientFactory.create()

// ---------------------------------------------------------------------------
// Production overload
// ---------------------------------------------------------------------------

/** Production overload — uses singleton PrismaClient from src/lib/prisma.ts */
export async function processArticles(): Promise<ProcessResult>
/** Test overload — accepts an injected PrismaClient */
export async function processArticles(client: PrismaClient): Promise<ProcessResult>
export async function processArticles(
  clientOrUndefined?: PrismaClient
): Promise<ProcessResult> {
  const db: PrismaClient =
    clientOrUndefined !== null &&
    clientOrUndefined !== undefined &&
    typeof clientOrUndefined === 'object' &&
    '$connect' in clientOrUndefined
      ? (clientOrUndefined as PrismaClient)
      : defaultPrisma

  // 1. Load pipeline config from DB (maxRetryCount, deadManThresholdHours)
  const pipelineConfig = await getPipelineConfig(db)

  // 2. Load all Bezirke once — needed for slug→id mapping and Step 1 context
  const allBezirke = await db.bezirk.findMany()
  const bezirkBySlug = new Map(allBezirke.map((b) => [b.slug, b]))

  // 3. Check circuit-breaker — halt early without opening a PipelineRun
  const proceed = await checkCostCircuitBreaker(db)
  if (!proceed) {
    return { articlesProcessed: 0, articlesWritten: 0, totalInputTokens: 0, totalOutputTokens: 0 }
  }

  // 4. Open PipelineRun
  const run = await db.pipelineRun.create({
    data: { startedAt: new Date() },
  })

  // 5. Load FETCHED and ERROR articles (ERROR = retryable failure)
  const articles = await db.article.findMany({
    where: { status: { in: ['FETCHED', 'ERROR'] } },
  })

  // 6. Create Anthropic client once per run (via factory — testable via _clientFactory.create)
  const anthropicClient = _clientFactory.create()

  let articlesProcessed = 0
  let articlesWritten = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  try {
    for (const article of articles) {
      articlesProcessed++
      try {
        // 5a. Extract article text from rawPayload or fallback
        let articleText: string
        if (article.rawPayload !== null && article.rawPayload !== undefined) {
          // rawPayload is Json (any object) — stringify for LLM consumption
          articleText =
            typeof article.rawPayload === 'string'
              ? article.rawPayload
              : JSON.stringify(article.rawPayload)
        } else {
          articleText = [article.title, article.content].filter(Boolean).join('\n\n')
        }

        // 5b. Step 1: Tag & Classify
        const step1 = await runStep1Tag(anthropicClient, articleText, allBezirke)
        totalInputTokens += step1.inputTokens
        totalOutputTokens += step1.outputTokens

        // 5c. Map bezirkSlugs → Bezirk IDs
        const matchedBezirke = step1.bezirkSlugs
          .map((slug) => bezirkBySlug.get(slug))
          .filter((b): b is NonNullable<typeof b> => b !== undefined)

        // 5d. Write TAGGED status + ArticleBezirk rows in a single transaction
        await db.$transaction([
          db.article.update({
            where: { id: article.id },
            data: { status: 'TAGGED' },
          }),
          ...matchedBezirke.map((bezirk) =>
            db.articleBezirk.upsert({
              where: {
                articleId_bezirkId: { articleId: article.id, bezirkId: bezirk.id },
              },
              create: { articleId: article.id, bezirkId: bezirk.id, taggedAt: new Date() },
              update: { taggedAt: new Date() },
            })
          ),
        ])

        // 5e. Step 2: Write & SEO
        const matchedBezirkNames = matchedBezirke.map((b) => b.name)
        const step2 = await runStep2Write(anthropicClient, articleText, matchedBezirkNames)
        totalInputTokens += step2.inputTokens
        totalOutputTokens += step2.outputTokens

        // 5f. Write final status + content + SEO fields
        const finalStatus = step1.hasNamedPerson ? 'REVIEW' : 'WRITTEN'
        await db.article.update({
          where: { id: article.id },
          data: {
            status: finalStatus,
            title: step2.headline,
            content: `${step2.lead}\n\n${step2.body}`,
            seoTitle: step2.seoTitle,
            metaDescription: step2.metaDescription,
          },
        })

        if (finalStatus === 'WRITTEN') {
          articlesWritten++
        }
      } catch (err) {
        // Per-article error: increment retryCount, mark ERROR or FAILED
        const newRetryCount = (article.retryCount ?? 0) + 1
        const nextStatus = newRetryCount >= pipelineConfig.maxRetryCount ? 'FAILED' : 'ERROR'
        await db.article.update({
          where: { id: article.id },
          data: {
            status: nextStatus,
            retryCount: newRetryCount,
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        })
        console.error(
          `[ai-pipeline] article id=${article.id} → ${nextStatus} (attempt ${newRetryCount}) — ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  } finally {
    // 7. Close PipelineRun with final counts (always, even on unexpected error)
    await db.pipelineRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        articlesProcessed,
        articlesWritten,
        totalInputTokens,
        totalOutputTokens,
      },
    })
  }

  // 8. Return ProcessResult
  return { articlesProcessed, articlesWritten, totalInputTokens, totalOutputTokens }
}
