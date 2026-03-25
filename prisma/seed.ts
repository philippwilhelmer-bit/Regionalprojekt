/**
 * Config-driven seed script for Prisma.
 * Reads bundesland from bundesland.config.ts and seeds matching data.
 *
 * Run via: npx prisma db seed
 * (configured in prisma.config.ts: migrations.seed = "tsx prisma/seed.ts")
 *
 * NOTE: The seed script creates its own PrismaClient instance directly.
 * This is the one exception to the singleton rule — seed.ts runs as a
 * standalone process (not inside Next.js), so hot-reload exhaustion is
 * not a concern here.
 */
import { PrismaClient } from '@prisma/client'
import config from '../bundesland.config'
import { steiermarkSources } from './seed-data/sources'
import type { SourceSeedEntry } from './seed-data/sources'

/**
 * Seed Bezirke for a given bundesland into the provided Prisma client.
 * Exported for testing — tests pass a pgLite-backed client and a bundesland name.
 *
 * Reads the region list from config.regions — no hardcoded data in this file.
 * If the bundesland param does not match config.bundesland, seeds 0 rows (early return).
 *
 * Uses upsert (not create) so the seed is idempotent and safe to re-run.
 * The update path only touches name — existing gemeindeSynonyms in production are preserved.
 */
export async function seedBezirke(
  prisma: PrismaClient,
  bundesland: string
): Promise<void> {
  if (bundesland !== config.bundesland) {
    console.log(`Skipping seedBezirke: bundesland mismatch (${bundesland} vs ${config.bundesland})`)
    return
  }

  for (const region of config.regions) {
    await prisma.bezirk.upsert({
      where: { slug: region.slug },
      update: { name: region.name },
      create: {
        slug: region.slug,
        name: region.name,
        gemeindeSynonyms: [],
      },
    })
  }

  console.log(`Seeded ${config.regions.length} Bezirke for ${bundesland}`)
}

/**
 * Seed Sources for a given bundesland into the provided Prisma client.
 * Exported for testing — tests pass a pgLite-backed client and a bundesland name.
 *
 * Uses upsert (not create) so the seed is idempotent and safe to re-run.
 * The unique key for sources is the URL.
 */
export async function seedSources(
  prisma: PrismaClient,
  bundesland: string
): Promise<void> {
  const seedData: SourceSeedEntry[] =
    bundesland === 'steiermark' ? steiermarkSources : []

  for (const source of seedData) {
    await prisma.source.upsert({
      where: { url: source.url },
      update: {
        type: source.type,
        enabled: source.enabled,
        pollIntervalMinutes: source.pollIntervalMinutes,
      },
      create: {
        type: source.type,
        url: source.url,
        enabled: source.enabled,
        pollIntervalMinutes: source.pollIntervalMinutes,
      },
    })
  }

  console.log(`Seeded ${seedData.length} Sources for ${bundesland}`)
}

/**
 * Main entry point — runs when invoked via `npx prisma db seed`.
 * Reads config.bundesland and uses it to select seed data.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient()
  try {
    await seedBezirke(prisma, config.bundesland)
    await seedSources(prisma, config.bundesland)
  } finally {
    await prisma.$disconnect()
  }
}

// Only run main when executed directly (not when imported by tests)
// tsx sets import.meta.url to the file being run; when imported, this is skipped
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
