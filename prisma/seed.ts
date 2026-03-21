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
import { steiermarkBezirke } from './seed-data/bezirke'
import type { BezirkSeedEntry } from './seed-data/bezirke'
import { steiermarkSources } from './seed-data/sources'
import type { SourceSeedEntry } from './seed-data/sources'

/**
 * Seed Bezirke for a given bundesland into the provided Prisma client.
 * Exported for testing — tests pass a pgLite-backed client and a bundesland name.
 *
 * Uses upsert (not create) so the seed is idempotent and safe to re-run.
 */
export async function seedBezirke(
  prisma: PrismaClient,
  bundesland: string
): Promise<void> {
  const seedData: BezirkSeedEntry[] =
    bundesland === 'steiermark' ? steiermarkBezirke : []

  for (const bezirk of seedData) {
    await prisma.bezirk.upsert({
      where: { slug: bezirk.slug },
      update: {
        name: bezirk.name,
        gemeindeSynonyms: bezirk.gemeindeSynonyms,
      },
      create: {
        slug: bezirk.slug,
        name: bezirk.name,
        gemeindeSynonyms: bezirk.gemeindeSynonyms,
      },
    })
  }

  console.log(`Seeded ${seedData.length} Bezirke for ${bundesland}`)
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
