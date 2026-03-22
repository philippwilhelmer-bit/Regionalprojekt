/**
 * AI Config DAL
 *
 * Provides find-or-create singleton access to AiConfig (global AI settings)
 * and per-source AiSourceConfig overrides.
 *
 * Requirements: AICONF-01, AICONF-02, AICONF-03
 *
 * DI pattern: optional PrismaClient as first parameter (duck-typed via '$connect' check).
 * Same pattern as established in sources.ts and articles.ts.
 */
import type { PrismaClient, AiConfig, AiSourceConfig } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedAiConfig {
  tone: 'NEUTRAL' | 'FORMAL' | 'CONVERSATIONAL'
  articleLength: 'SHORT' | 'MEDIUM' | 'LONG'
  styleNotes: string | null
  modelOverride: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDb(db?: PrismaClient): PrismaClient {
  return db !== undefined && db !== null && '$connect' in db ? db : defaultPrisma
}

// ---------------------------------------------------------------------------
// AiConfig (global singleton)
// ---------------------------------------------------------------------------

/**
 * Find-or-create the global AiConfig singleton.
 * Creates with NEUTRAL tone and MEDIUM article length defaults if none exists.
 */
export async function getAiConfig(db?: PrismaClient): Promise<AiConfig> {
  const client = getDb(db)
  const existing = await client.aiConfig.findFirst()
  if (existing) return existing
  return client.aiConfig.create({
    data: { tone: 'NEUTRAL', articleLength: 'MEDIUM' },
  })
}

/**
 * Update (or create) the global AiConfig singleton.
 * DI: pass PrismaClient as first arg for tests; omit for production.
 */
export async function upsertAiConfig(
  dbOrData:
    | PrismaClient
    | Partial<{
        tone: AiConfig['tone']
        articleLength: AiConfig['articleLength']
        styleNotes: string | null
        modelOverride: string | null
      }>,
  data?: Partial<{
    tone: AiConfig['tone']
    articleLength: AiConfig['articleLength']
    styleNotes: string | null
    modelOverride: string | null
  }>
): Promise<AiConfig> {
  let client: PrismaClient
  let opts: Partial<{
    tone: AiConfig['tone']
    articleLength: AiConfig['articleLength']
    styleNotes: string | null
    modelOverride: string | null
  }>

  if (dbOrData !== null && typeof dbOrData === 'object' && '$connect' in dbOrData) {
    client = dbOrData as PrismaClient
    opts = data!
  } else {
    client = defaultPrisma
    opts = dbOrData as typeof opts
  }

  const existing = await client.aiConfig.findFirst()
  if (existing) {
    return client.aiConfig.update({
      where: { id: existing.id },
      data: opts,
    })
  }
  return client.aiConfig.create({
    data: {
      tone: opts.tone ?? 'NEUTRAL',
      articleLength: opts.articleLength ?? 'MEDIUM',
      styleNotes: opts.styleNotes ?? null,
      modelOverride: opts.modelOverride ?? null,
    },
  })
}

// ---------------------------------------------------------------------------
// AiSourceConfig (per-source overrides)
// ---------------------------------------------------------------------------

/**
 * Resolve AI config for a given source:
 * merges per-source overrides onto global defaults.
 * NULL override fields fall through to global values.
 * DI: pass PrismaClient as first arg for tests; omit for production.
 */
export async function getResolvedAiConfig(
  dbOrSourceId: PrismaClient | number,
  sourceId?: number
): Promise<ResolvedAiConfig> {
  let client: PrismaClient
  let sid: number | null

  if (dbOrSourceId !== null && typeof dbOrSourceId === 'object' && '$connect' in dbOrSourceId) {
    client = dbOrSourceId as PrismaClient
    sid = sourceId ?? null
  } else {
    client = defaultPrisma
    sid = dbOrSourceId as number
  }

  const global = await getAiConfig(client)

  let override: AiSourceConfig | null = null
  if (sid !== null && sid !== undefined) {
    override = await client.aiSourceConfig.findFirst({
      where: { sourceId: sid },
    })
  }

  return {
    tone: override?.tone ?? global.tone,
    articleLength: override?.articleLength ?? global.articleLength,
    styleNotes: override?.styleNotes ?? global.styleNotes,
    modelOverride: override?.modelOverride ?? global.modelOverride,
  }
}

/**
 * Create or update a per-source AiSourceConfig row.
 * DI: pass PrismaClient as first arg for tests; omit for production.
 */
export async function upsertAiSourceConfig(
  dbOrData:
    | PrismaClient
    | {
        sourceId: number
        tone?: AiSourceConfig['tone']
        articleLength?: AiSourceConfig['articleLength']
        styleNotes?: string | null
        modelOverride?: string | null
      },
  data?: {
    sourceId: number
    tone?: AiSourceConfig['tone']
    articleLength?: AiSourceConfig['articleLength']
    styleNotes?: string | null
    modelOverride?: string | null
  }
): Promise<AiSourceConfig> {
  let client: PrismaClient
  let opts: {
    sourceId: number
    tone?: AiSourceConfig['tone']
    articleLength?: AiSourceConfig['articleLength']
    styleNotes?: string | null
    modelOverride?: string | null
  }

  if (dbOrData !== null && typeof dbOrData === 'object' && '$connect' in dbOrData) {
    client = dbOrData as PrismaClient
    opts = data!
  } else {
    client = defaultPrisma
    opts = dbOrData as typeof opts
  }

  return client.aiSourceConfig.upsert({
    where: { sourceId: opts.sourceId },
    create: {
      sourceId: opts.sourceId,
      tone: opts.tone,
      articleLength: opts.articleLength,
      styleNotes: opts.styleNotes,
      modelOverride: opts.modelOverride,
    },
    update: {
      tone: opts.tone,
      articleLength: opts.articleLength,
      styleNotes: opts.styleNotes,
      modelOverride: opts.modelOverride,
    },
  })
}

/**
 * Delete per-source config, resetting that source to global defaults.
 * DI: pass PrismaClient as first arg for tests; omit for production.
 */
export async function deleteAiSourceConfig(
  dbOrSourceId: PrismaClient | number,
  sourceId?: number
): Promise<void> {
  let client: PrismaClient
  let sid: number

  if (dbOrSourceId !== null && typeof dbOrSourceId === 'object' && '$connect' in dbOrSourceId) {
    client = dbOrSourceId as PrismaClient
    sid = sourceId!
  } else {
    client = defaultPrisma
    sid = dbOrSourceId as number
  }

  await client.aiSourceConfig.deleteMany({ where: { sourceId: sid } })
}
