/**
 * Ingest CLI entry point.
 *
 * Fetches all enabled sources and calls ingest() for each.
 * This script is intentionally simple — it is a runnable trigger, not a daemon.
 * Phase 4 adds a timer that calls this script on a schedule.
 *
 * Run via: tsx scripts/ingest-run.ts
 */
import { listSources } from '../src/lib/content/sources'
import { ingest } from '../src/lib/ingestion/ingest'

async function main() {
  const sources = await listSources({ enabled: true })
  console.log(`[ingest-run] Starting: ${sources.length} enabled source(s)`)

  let totalFound = 0
  let totalNew = 0
  const errors: string[] = []

  for (const source of sources) {
    try {
      const result = await ingest(source)
      totalFound += result.itemsFound
      totalNew += result.itemsNew
      console.log(
        `[ingest-run] source=${source.id} type=${source.type} found=${result.itemsFound} new=${result.itemsNew}`
      )
    } catch (err) {
      const msg = `source=${source.id} type=${source.type} error=${String(err)}`
      console.error(`[ingest-run] FAILED ${msg}`)
      errors.push(msg)
    }
  }

  console.log(
    `[ingest-run] Done: totalFound=${totalFound} totalNew=${totalNew} errors=${errors.length}`
  )
  if (errors.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[ingest-run] Fatal:', err)
  process.exit(1)
})
