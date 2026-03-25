/**
 * One-time backfill script: set isStateWide=true on articles with no Bezirk associations
 *
 * Targets articles that were processed before the isStateWide pipeline fix landed.
 * Those articles have no ArticleBezirk rows and are silently invisible to all readers.
 *
 * Usage: bun run src/scripts/backfill-state-wide.ts [--dry-run]
 * Preview: bun run src/scripts/backfill-state-wide.ts --dry-run
 * Apply:   bun run src/scripts/backfill-state-wide.ts
 *
 * Requirements: AI-02
 */
import { prisma } from '../lib/prisma'

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  const candidates = await prisma.article.findMany({
    where: {
      bezirke: { none: {} },
      status: { in: ['PUBLISHED', 'WRITTEN', 'REVIEW'] },
    },
    select: { id: true, title: true, status: true },
  })

  console.log(`[backfill] Found ${candidates.length} candidate(s)`)
  for (const c of candidates) {
    console.log(`  id=${c.id} status=${c.status} title="${c.title}"`)
  }

  if (dryRun) {
    console.log('[backfill] Dry run — no changes written. Re-run without --dry-run to apply.')
    return
  }

  if (candidates.length === 0) {
    console.log('[backfill] Nothing to update.')
    return
  }

  const result = await prisma.article.updateMany({
    where: { id: { in: candidates.map((a) => a.id) } },
    data: { isStateWide: true },
  })

  console.log(`[backfill] Updated ${result.count} article(s) → isStateWide=true`)
}

// Bun guard: only run when executed directly
// (import.meta.main is a Bun extension — cast needed for TS compatibility)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((import.meta as any).main) {
  main().catch((err) => {
    console.error('[backfill] Fatal:', err)
    process.exit(1)
  })
}
