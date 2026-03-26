import { NextResponse } from 'next/server'
import { listSources } from '@/lib/content/sources'
import { ingest } from '@/lib/ingestion/ingest'
import { checkDeadMan } from '@/lib/publish/dead-man'
import { processArticles } from '@/lib/ai/pipeline'
import { publishArticles } from '@/lib/publish/publish'

export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const log: string[] = []

  // Step 1: Ingest pipeline
  try {
    const sources = await listSources({ enabled: true })
    log.push(`[ingest] ${sources.length} enabled source(s)`)

    let totalFound = 0
    let totalNew = 0
    const errors: string[] = []

    for (const source of sources) {
      try {
        const result = await ingest(source)
        totalFound += result.itemsFound
        totalNew += result.itemsNew
      } catch (err) {
        errors.push(`source=${source.id}: ${String(err)}`)
      }
    }

    log.push(`[ingest] found=${totalFound} new=${totalNew} errors=${errors.length}`)
    if (errors.length > 0) log.push(...errors.map(e => `[ingest-err] ${e}`))
  } catch (err) {
    log.push(`[ingest] Fatal: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Step 2: AI + publish pipeline
  try {
    await checkDeadMan()
    const aiResult = await processArticles()
    const pubResult = await publishArticles()
    log.push(
      `[ai] processed=${aiResult.articlesProcessed} written=${aiResult.articlesWritten} ` +
        `published=${pubResult.articlesPublished} reviewBacklog=${pubResult.reviewBacklog}`
    )
  } catch (err) {
    log.push(`[ai] Fatal: ${err instanceof Error ? err.message : String(err)}`)
  }

  const durationMs = Date.now() - startTime
  log.push(`duration=${durationMs}ms`)

  return NextResponse.json({ ok: true, log })
}
