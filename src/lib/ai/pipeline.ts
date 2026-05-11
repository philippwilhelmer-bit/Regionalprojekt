/**
 * AI Pipeline Orchestrator
 *
 * processArticles() reads FETCHED / ERROR / TAGGED articles and drives them to
 * WRITTEN or REVIEW through one of two paths, gated by AI_USE_MERGED_CALL:
 *
 * - AI_USE_MERGED_CALL='true' (default): single tool_use call via runMergedCall
 *   (Plan 43-01). One Anthropic call per article. Tagging + writing fused.
 *
 * - AI_USE_MERGED_CALL='false': legacy two-call path via runStep1Tag +
 *   runStep2Write. Kept in tree for one milestone as the rollback safety net
 *   (v3.3 cleanup removes it).
 *
 * Source-typed text extraction lives in src/lib/ai/extractors (Plan 43-02);
 * the pipeline never JSON.stringifies the raw payload.
 *
 * Token accounting:
 * - totalInputTokens = fresh input + cache_creation_input_tokens (merged path)
 *   + step1/step2 inputs (legacy path) + fallback inputs (only when invoked).
 * - totalCachedInputTokens = cache_read_input_tokens (merged path only).
 *   In-memory running aggregate exposed via ProcessResult; the PipelineRun
 *   column shape is unchanged this phase (Phase 44 persists it).
 * - totalOutputTokens = output across all calls (merged or legacy + fallback).
 *
 * AIPL-07: retry selector includes TAGGED so any in-flight rows from the
 *          two-step path are reprocessed once the merged path goes live.
 * AIPL-08: location-fallback tokens are summed into the PipelineRun totals
 *          only when llmLocationFallback was actually invoked (extractLocation
 *          returned null).
 * AIPL-09: Anthropic client constructed with {maxRetries: 2} so SDK transient
 *          retries don't inflate Article.retryCount.
 *
 * DI pattern: zero-arg production path uses singleton PrismaClient;
 * injected-client path used in tests (duck-typed via '$connect' check,
 * same pattern as ingest.ts).
 *
 * Requirements: AI-01..05, SEO-02, AIPL-06..10
 */
import type { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { prisma as defaultPrisma } from '../prisma'
import { checkCostCircuitBreaker } from './circuit-breaker'
import { runStep1Tag } from './steps/step1-tag'
import { runStep2Write } from './steps/step2-write'
import { runMergedCall } from './steps/merged'
import { extractArticleText } from './extractors'
import { getPipelineConfig } from '../admin/pipeline-config-dal'
import { extractLocation, llmLocationFallback } from '../images/locextract'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ProcessResult {
  articlesProcessed: number
  articlesWritten: number
  totalInputTokens: number
  /**
   * AIPL-05: aggregated cache_read_input_tokens across all merged calls in this
   * run. Surfaced via the return value so downstream telemetry (Phase 44 will
   * persist it to the PipelineRun row) has a stable contract. The legacy two-
   * step path does not produce cache reads and contributes 0 here.
   */
  totalCachedInputTokens: number
  totalOutputTokens: number
}

// ---------------------------------------------------------------------------
// Internal — exported only for test overrides
// ---------------------------------------------------------------------------

/**
 * Factory object used to create the Anthropic client once per run.
 *
 * AIPL-09: constructed with {maxRetries: 2} so the SDK's internal exponential
 * backoff handles transient 429/500/network errors WITHOUT incrementing
 * Article.retryCount on each underlying attempt. Article-level retries
 * (controlled by maxRetryCount in PipelineConfig) only kick in for errors
 * that survive the SDK's own retry loop.
 *
 * Tests can override _clientFactory.create before calling processArticles():
 *   pipeline._clientFactory.create = () => mockClient
 */
export const _clientFactory = {
  create: (): Anthropic => new Anthropic({ maxRetries: 2 }),
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
    return {
      articlesProcessed: 0,
      articlesWritten: 0,
      totalInputTokens: 0,
      totalCachedInputTokens: 0,
      totalOutputTokens: 0,
    }
  }

  // 4. Open PipelineRun
  const run = await db.pipelineRun.create({
    data: { startedAt: new Date() },
  })

  // 5. Load retryable articles. AIPL-07: TAGGED is included alongside FETCHED
  //    and ERROR so any in-flight TAGGED rows left over from the legacy
  //    two-step path are picked up on the next pipeline run. The one-time
  //    AIPL-10 SQL clears the bulk of these before deploy; this selector is
  //    defense in depth.
  const articles = await db.article.findMany({
    where: { status: { in: ['FETCHED', 'ERROR', 'TAGGED'] } },
  })

  // 6. Create Anthropic client once per run (via factory — testable via _clientFactory.create)
  const anthropicClient = _clientFactory.create()

  // Resolve the merged-call flag once per run so tests can stub it via
  // vi.stubEnv('AI_USE_MERGED_CALL', '...') without per-article overhead.
  const useMergedCall = (process.env.AI_USE_MERGED_CALL ?? 'true') === 'true'

  let articlesProcessed = 0
  let articlesWritten = 0
  let totalInputTokens = 0
  let totalCachedInputTokens = 0
  let totalOutputTokens = 0

  try {
    for (const article of articles) {
      articlesProcessed++
      try {
        // 5a. Source-typed article-text extraction (AIPL-06, wired from Plan
        //     43-02). The dispatcher handles null/empty rawPayload by falling
        //     back to [title, content].join('\n\n'), so no conditional needed.
        const articleText = extractArticleText(
          article.source,
          article.rawPayload,
          article.title ?? undefined,
          article.content ?? undefined,
        )

        if (useMergedCall) {
          // ---------------------------------------------------------------
          // Merged path (AIPL-01..05): single tool_use call
          // ---------------------------------------------------------------
          const merged = await runMergedCall(
            anthropicClient,
            articleText,
            allBezirke,
            db,
            article.sourceId ?? undefined,
          )
          // AIPL-05: totalInputTokens absorbs both fresh input AND cache-creation
          // writes (both are billable input); cache reads aggregate separately.
          totalInputTokens += merged.inputTokens + merged.cacheCreationTokens
          totalCachedInputTokens += merged.cachedInputTokens
          totalOutputTokens += merged.outputTokens

          // Defensive guard — merged.ts already enforces this at the schema
          // boundary, but warn here so we notice if a model ever violates it.
          if (merged.isStateWide && merged.bezirkSlugs.length > 0) {
            console.warn(
              `[ai-pipeline] article id=${article.id} — isStateWide=true with non-empty bezirkSlugs, guard applied`,
            )
          }

          const matchedBezirke = merged.isStateWide
            ? []
            : merged.bezirkSlugs
                .map((slug) => bezirkBySlug.get(slug))
                .filter((b): b is NonNullable<typeof b> => b !== undefined)

          // Final status: REVIEW if private individual mentioned OR no
          // bezirke matched AND not state-wide (no Steiermark relevance).
          // Otherwise WRITTEN.
          const finalStatus: 'WRITTEN' | 'REVIEW' =
            merged.mentionsPrivateIndividual ||
            (merged.bezirkSlugs.length === 0 && !merged.isStateWide)
              ? 'REVIEW'
              : 'WRITTEN'

          // Map block — preserved from legacy with AIPL-08 token accounting.
          // Wrapped in its own try/catch so map errors never affect article status.
          let mapImageUpdate: { imageUrl: string; imageCredit: string } | null = null
          if (!article.imageUrl) {
            try {
              const articleContent = [merged.headline, merged.lead, merged.body].join('\n\n')
              let locationName = extractLocation(articleContent)
              if (!locationName) {
                // AIPL-08: tokens only attributed when fallback actually invoked
                const fallbackResult = await llmLocationFallback(anthropicClient, articleContent)
                totalInputTokens += fallbackResult.inputTokens
                totalOutputTokens += fallbackResult.outputTokens
                locationName = fallbackResult.location
              }
              if (locationName) {
                const geo = await geocodeLocation(db, locationName)
                if (geo) {
                  const mapImage = await generateMapImage(
                    geo.lat,
                    geo.lon,
                    merged.headline,
                    article.id,
                    geo.locationType,
                  )
                  if (mapImage) {
                    mapImageUpdate = { imageUrl: mapImage.url, imageCredit: mapImage.credit }
                  }
                }
              }
            } catch (mapErr) {
              // INTG-02: map failure never blocks publication
              console.warn(
                `[pipeline] map skipped id=${article.id} -- ${mapErr instanceof Error ? mapErr.message : String(mapErr)}`,
              )
            }
          }

          // Single transactional write — status + content + SEO + bezirk upserts
          // (+ optional map image). Replaces the legacy two writes (intermediate
          // TAGGED + final WRITTEN/REVIEW) with one atomic transition.
          await db.$transaction([
            db.article.update({
              where: { id: article.id },
              data: {
                status: finalStatus,
                isStateWide: merged.isStateWide,
                title: merged.headline,
                content: `${merged.lead}\n\n${merged.body}`,
                seoTitle: merged.seoTitle,
                metaDescription: merged.metaDescription,
                ...(mapImageUpdate ?? {}),
              },
            }),
            ...matchedBezirke.map((bezirk) =>
              db.articleBezirk.upsert({
                where: {
                  articleId_bezirkId: { articleId: article.id, bezirkId: bezirk.id },
                },
                create: { articleId: article.id, bezirkId: bezirk.id, taggedAt: new Date() },
                update: { taggedAt: new Date() },
              }),
            ),
          ])

          if (finalStatus === 'WRITTEN') {
            articlesWritten++
          }
        } else {
          // ---------------------------------------------------------------
          // Legacy two-step path — preserved verbatim for rollback safety.
          // Deletes in v3.3 cleanup phase.
          // ---------------------------------------------------------------

          // 5b. Step 1: Tag & Classify
          const step1 = await runStep1Tag(anthropicClient, articleText, allBezirke)
          totalInputTokens += step1.inputTokens
          totalOutputTokens += step1.outputTokens

          // 5c. Detect steiermark-weit before slug→ID mapping
          const isStateWide = step1.bezirkSlugs.includes('steiermark-weit')

          if (isStateWide && step1.bezirkSlugs.length > 1) {
            console.warn(
              `[ai-pipeline] article id=${article.id} — 'steiermark-weit' returned alongside other slugs: ${step1.bezirkSlugs.join(', ')} — check Step 1 prompt`,
            )
          }

          // 5d. Write TAGGED status + bezirk associations
          let matchedBezirke: (typeof allBezirke)[number][] = []
          if (isStateWide) {
            await db.article.update({
              where: { id: article.id },
              data: { status: 'TAGGED', isStateWide: true },
            })
            // No ArticleBezirk rows for state-wide articles
          } else {
            matchedBezirke = step1.bezirkSlugs
              .map((slug) => bezirkBySlug.get(slug))
              .filter((b): b is NonNullable<typeof b> => b !== undefined)

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
                }),
              ),
            ])
          }

          // 5e. Step 2: Write & SEO
          const matchedBezirkNames = matchedBezirke.map((b) => b.name)
          const step2 = await runStep2Write(
            anthropicClient,
            articleText,
            matchedBezirkNames,
            db,
            article.sourceId ?? undefined,
          )
          totalInputTokens += step2.inputTokens
          totalOutputTokens += step2.outputTokens

          // 5f. Map generation — same AIPL-08 accounting applies in both paths.
          if (!article.imageUrl) {
            try {
              const articleContent = [step2.headline, step2.lead, step2.body].join('\n\n')
              let locationName = extractLocation(articleContent)
              if (!locationName) {
                const fallbackResult = await llmLocationFallback(anthropicClient, articleContent)
                totalInputTokens += fallbackResult.inputTokens
                totalOutputTokens += fallbackResult.outputTokens
                locationName = fallbackResult.location
              }

              if (locationName) {
                const geo = await geocodeLocation(db, locationName)
                if (geo) {
                  const mapImage = await generateMapImage(
                    geo.lat,
                    geo.lon,
                    step2.headline,
                    article.id,
                    geo.locationType,
                  )
                  if (mapImage) {
                    await db.article.update({
                      where: { id: article.id },
                      data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
                    })
                  }
                }
              }
            } catch (mapErr) {
              console.warn(
                `[pipeline] map skipped id=${article.id} -- ${mapErr instanceof Error ? mapErr.message : String(mapErr)}`,
              )
            }
          }

          // 5g. Write final status + content + SEO fields
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
          `[ai-pipeline] article id=${article.id} → ${nextStatus} (attempt ${newRetryCount}) — ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  } finally {
    // 7. Close PipelineRun with final counts (always, even on unexpected error).
    //    totalCachedInputTokens is NOT persisted to the PipelineRun row this
    //    phase (column shape unchanged) — it surfaces via the return value
    //    until Phase 44 adds the column.
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
  return {
    articlesProcessed,
    articlesWritten,
    totalInputTokens,
    totalCachedInputTokens,
    totalOutputTokens,
  }
}
