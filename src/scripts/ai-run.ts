/**
 * AI + Publish Pipeline CLI entry point
 *
 * Execution order (per Phase 4 design):
 *   1. checkDeadMan()    — alert if pipeline has been silent > threshold
 *   2. processArticles() — run AI tagging + writing on FETCHED/ERROR articles
 *   3. publishArticles() — advance all WRITTEN articles to PUBLISHED
 *
 * Exits with code 1 only on fatal (top-level) errors.
 * Per-article and per-step errors are handled internally (logged, not fatal).
 *
 * Usage:
 *   bun run src/scripts/ai-run.ts
 *
 * Requirements: PUB-01, PUB-02, PUB-03
 */
import { checkDeadMan } from '../lib/publish/dead-man'
import { processArticles } from '../lib/ai/pipeline'
import { publishArticles } from '../lib/publish/publish'

async function main(): Promise<void> {
  try {
    await checkDeadMan()
    const aiResult = await processArticles()
    const pubResult = await publishArticles()
    console.log(
      `[ai-run] processed=${aiResult.articlesProcessed} written=${aiResult.articlesWritten} ` +
      `published=${pubResult.articlesPublished} reviewBacklog=${pubResult.reviewBacklog} ` +
      `inputTokens=${aiResult.totalInputTokens} outputTokens=${aiResult.totalOutputTokens}`
    )
  } catch (err) {
    console.error('[ai-run] Fatal error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

// Bun guard: only run when executed directly
// (import.meta.main is a Bun extension — cast needed for TS compatibility)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((import.meta as any).main) {
  main()
}
