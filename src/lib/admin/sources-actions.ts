'use server'
/**
 * Source management Server Actions — CMS-04
 *
 * Exports DB-layer functions (createSourceDb, updateSourceDb, listSourcesAdmin)
 * and Server Action wrappers with auth guard.
 *
 * DB-layer functions accept an optional PrismaClient for DI in tests.
 * Duck-typing via '$connect' (not instanceof) for vitest module isolation.
 */
import type { PrismaClient, Source, ArticleSource } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateSourceInput {
  url: string
  type: ArticleSource
  pollIntervalMinutes?: number
}

export interface UpdateSourceInput {
  id: number
  pollIntervalMinutes?: number
  healthFailureThreshold?: number
  enabled?: boolean
}

export interface IngestionRunStats {
  itemsFound: number | null
  itemsNew: number | null
  createdAt: Date
}

export interface SourceAdminRow extends Source {
  latestRun: IngestionRunStats | null
  failedErrorCount: number
}

// ─────────────────────────────────────────────
// createSourceDb (DB layer)
// ─────────────────────────────────────────────

export async function createSourceDb(db: PrismaClient, input: CreateSourceInput): Promise<Source>
export async function createSourceDb(input: CreateSourceInput): Promise<Source>
export async function createSourceDb(
  dbOrInput: PrismaClient | CreateSourceInput,
  input?: CreateSourceInput
): Promise<Source> {
  let db: PrismaClient
  let opts: CreateSourceInput

  if (
    dbOrInput !== null &&
    typeof dbOrInput === 'object' &&
    '$connect' in dbOrInput
  ) {
    db = dbOrInput as PrismaClient
    opts = input!
  } else {
    db = defaultPrisma
    opts = dbOrInput as CreateSourceInput
  }

  return db.source.create({
    data: {
      url: opts.url,
      type: opts.type,
      pollIntervalMinutes: opts.pollIntervalMinutes ?? 15,
      enabled: true,
      healthStatus: 'OK',
      healthFailureThreshold: 3,
    },
  })
}

// ─────────────────────────────────────────────
// updateSourceDb (DB layer)
// ─────────────────────────────────────────────

export async function updateSourceDb(db: PrismaClient, input: UpdateSourceInput): Promise<Source>
export async function updateSourceDb(input: UpdateSourceInput): Promise<Source>
export async function updateSourceDb(
  dbOrInput: PrismaClient | UpdateSourceInput,
  input?: UpdateSourceInput
): Promise<Source> {
  let db: PrismaClient
  let opts: UpdateSourceInput

  if (
    dbOrInput !== null &&
    typeof dbOrInput === 'object' &&
    '$connect' in dbOrInput
  ) {
    db = dbOrInput as PrismaClient
    opts = input!
  } else {
    db = defaultPrisma
    opts = dbOrInput as UpdateSourceInput
  }

  const { id, ...data } = opts
  return db.source.update({
    where: { id },
    data,
  })
}

// ─────────────────────────────────────────────
// listSourcesAdmin (DB layer)
// ─────────────────────────────────────────────

export async function listSourcesAdmin(db: PrismaClient): Promise<SourceAdminRow[]>
export async function listSourcesAdmin(): Promise<SourceAdminRow[]>
export async function listSourcesAdmin(db?: PrismaClient): Promise<SourceAdminRow[]> {
  const client = (db !== undefined && db !== null && '$connect' in db) ? db : defaultPrisma

  const sources = await client.source.findMany({
    orderBy: { id: 'asc' },
    include: {
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
  })

  const result: SourceAdminRow[] = await Promise.all(
    sources.map(async (source) => {
      // Count FAILED + ERROR articles for this source type
      // Note: Articles reference source TYPE not source ID (no FK).
      // If multiple sources share the same type, the count is approximate.
      const failedErrorCount = await client.article.count({
        where: {
          source: source.type,
          status: { in: ['FAILED', 'ERROR'] },
        },
      })

      const latestRun = source.runs[0]
        ? {
            itemsFound: source.runs[0].itemsFound,
            itemsNew: source.runs[0].itemsNew,
            createdAt: source.runs[0].startedAt,
          }
        : null

      const { runs: _, ...sourceData } = source

      return {
        ...sourceData,
        latestRun,
        failedErrorCount,
      }
    })
  )

  return result
}

// ─────────────────────────────────────────────
// Server Action wrappers
// ─────────────────────────────────────────────

/**
 * Server Action: create a new source.
 * Requires editor session (auth guard in middleware for /admin routes).
 */
export async function createSource(input: CreateSourceInput): Promise<Source> {
  return createSourceDb(input)
}

/**
 * Server Action: update an existing source.
 * Requires editor session (auth guard in middleware for /admin routes).
 */
export async function updateSource(input: UpdateSourceInput): Promise<Source> {
  return updateSourceDb(input)
}
