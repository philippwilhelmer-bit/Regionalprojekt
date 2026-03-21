/**
 * AI Pipeline CLI entry point
 *
 * Calls processArticles() (production path, no client injection) and logs
 * the result. Exits with code 1 if an unhandled error occurs.
 *
 * Usage:
 *   bun run src/scripts/ai-run.ts
 *
 * Mirror of src/scripts/ingest-run.ts pattern.
 */
import { processArticles } from '../lib/ai/pipeline'

async function main(): Promise<void> {
  try {
    const result = await processArticles()
    console.log(
      `[ai-run] processed=${result.articlesProcessed} written=${result.articlesWritten} inputTokens=${result.totalInputTokens} outputTokens=${result.totalOutputTokens}`
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
