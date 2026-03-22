/**
 * Pipeline Config DAL
 *
 * Provides find-or-create singleton access to PipelineConfig
 * (maxRetryCount, deadManThresholdHours).
 *
 * Requirements: AICONF-03
 *
 * DI pattern: optional PrismaClient as first parameter (duck-typed via '$connect' check).
 * Same pattern as established in sources.ts and articles.ts.
 */
import type { PrismaClient, PipelineConfig } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDb(db?: PrismaClient): PrismaClient {
  return db !== undefined && db !== null && '$connect' in db ? db : defaultPrisma
}

// ---------------------------------------------------------------------------
// PipelineConfig singleton
// ---------------------------------------------------------------------------

/**
 * Find-or-create the PipelineConfig singleton.
 * Creates with maxRetryCount=3 and deadManThresholdHours=6 defaults if none exists.
 */
export async function getPipelineConfig(db?: PrismaClient): Promise<PipelineConfig> {
  const client = getDb(db)
  const existing = await client.pipelineConfig.findFirst()
  if (existing) return existing
  return client.pipelineConfig.create({
    data: { maxRetryCount: 3, deadManThresholdHours: 6 },
  })
}

/**
 * Update (or create) the PipelineConfig singleton.
 * DI: pass PrismaClient as first arg for tests; omit for production.
 */
export async function upsertPipelineConfig(
  dbOrData:
    | PrismaClient
    | Partial<{
        maxRetryCount: number
        deadManThresholdHours: number
      }>,
  data?: Partial<{
    maxRetryCount: number
    deadManThresholdHours: number
  }>
): Promise<PipelineConfig> {
  let client: PrismaClient
  let opts: Partial<{ maxRetryCount: number; deadManThresholdHours: number }>

  if (dbOrData !== null && typeof dbOrData === 'object' && '$connect' in dbOrData) {
    client = dbOrData as PrismaClient
    opts = data!
  } else {
    client = defaultPrisma
    opts = dbOrData as typeof opts
  }

  const existing = await client.pipelineConfig.findFirst()
  if (existing) {
    return client.pipelineConfig.update({
      where: { id: existing.id },
      data: opts,
    })
  }
  return client.pipelineConfig.create({
    data: {
      maxRetryCount: opts.maxRetryCount ?? 3,
      deadManThresholdHours: opts.deadManThresholdHours ?? 6,
    },
  })
}
