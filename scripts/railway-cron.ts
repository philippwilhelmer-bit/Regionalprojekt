/**
 * Combined Railway cron entry point.
 * Runs ingest pipeline, then AI pipeline, sequentially.
 * Designed for Railway cron service: runs on schedule, exits cleanly.
 *
 * Usage: npx tsx scripts/railway-cron.ts
 * Railway cron schedule: 0 */2 * * * (every 2 hours)
 *
 * Consolidates: ingest-run.ts + ai-run.ts into a single Railway cron service.
 */
import { listSources } from '../src/lib/content/sources'
import { ingest } from '../src/lib/ingestion/ingest'
import { checkDeadMan } from '../src/lib/publish/dead-man'
import { processArticles } from '../src/lib/ai/pipeline'
import { publishArticles } from '../src/lib/publish/publish'

async function runIngest(): Promise<{ success: boolean }> {
  console.log('[railway-cron] [ingest] Starting ingest pipeline')
  const sources = await listSources({ enabled: true })
  console.log(`[railway-cron] [ingest] ${sources.length} enabled source(s)`)

  let totalFound = 0
  let totalNew = 0
  const errors: string[] = []

  for (const source of sources) {
    try {
      const result = await ingest(source)
      totalFound += result.itemsFound
      totalNew += result.itemsNew
      console.log(
        `[railway-cron] [ingest] source=${source.id} type=${source.type} found=${result.itemsFound} new=${result.itemsNew}`
      )
    } catch (err) {
      const msg = `source=${source.id} type=${source.type} error=${String(err)}`
      console.error(`[railway-cron] [ingest] FAILED ${msg}`)
      errors.push(msg)
    }
  }

  console.log(
    `[railway-cron] [ingest] Done: totalFound=${totalFound} totalNew=${totalNew} errors=${errors.length}`
  )
  return { success: errors.length === 0 }
}

async function runAiPipeline(): Promise<void> {
  console.log('[railway-cron] [ai] Starting AI pipeline')
  await checkDeadMan()
  const aiResult = await processArticles()
  const pubResult = await publishArticles()
  console.log(
    `[railway-cron] [ai] processed=${aiResult.articlesProcessed} written=${aiResult.articlesWritten} ` +
      `published=${pubResult.articlesPublished} reviewBacklog=${pubResult.reviewBacklog} ` +
      `inputTokens=${aiResult.totalInputTokens} outputTokens=${aiResult.totalOutputTokens}`
  )
}

async function main(): Promise<void> {
  const startTime = new Date()
  console.log(`[railway-cron] Start: ${startTime.toISOString()}`)

  let fatalError = false

  // Step 1: Run ingest pipeline
  // Even if ingest fails (e.g. network issues), we continue to AI pipeline
  // because previously fetched articles may still be waiting for processing.
  try {
    const { success } = await runIngest()
    if (!success) {
      console.warn('[railway-cron] Ingest completed with errors — continuing to AI pipeline')
    }
  } catch (err) {
    console.error('[railway-cron] [ingest] Fatal error:', err instanceof Error ? err.message : String(err))
    console.warn('[railway-cron] Ingest failed — continuing to AI pipeline anyway')
  }

  // Step 2: Run AI + publish pipeline
  try {
    await runAiPipeline()
  } catch (err) {
    console.error('[railway-cron] [ai] Fatal error:', err instanceof Error ? err.message : String(err))
    fatalError = true
  }

  const endTime = new Date()
  const durationMs = endTime.getTime() - startTime.getTime()
  console.log(`[railway-cron] End: ${endTime.toISOString()} duration=${durationMs}ms`)

  if (fatalError) {
    console.error('[railway-cron] Exiting with failure (AI pipeline fatal error)')
    process.exit(1)
  }

  console.log('[railway-cron] Completed successfully')
  process.exit(0)
}

main().catch((err) => {
  console.error('[railway-cron] Unhandled fatal error:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
