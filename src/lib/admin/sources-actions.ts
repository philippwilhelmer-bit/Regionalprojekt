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
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
 * Server Action: create a new source (typed input).
 * Requires editor session (auth guard in middleware for /admin routes).
 */
export async function createSource(input: CreateSourceInput): Promise<Source> {
  return createSourceDb(input)
}

/**
 * Server Action: update an existing source (typed input).
 * Requires editor session (auth guard in middleware for /admin routes).
 */
export async function updateSource(input: UpdateSourceInput): Promise<Source> {
  return updateSourceDb(input)
}

// ─────────────────────────────────────────────
// FormData Server Action wrappers (for HTML form action={})
// ─────────────────────────────────────────────

/**
 * Server Action: create a new source from an HTML form.
 * Form fields: url, type, pollIntervalMinutes
 * Redirects to /admin/sources on success.
 */
export async function createSourceForm(formData: FormData): Promise<void> {
  const url = formData.get('url')?.toString() ?? ''
  const type = formData.get('type')?.toString() as ArticleSource
  const pollIntervalMinutes = parseInt(formData.get('pollIntervalMinutes')?.toString() ?? '60', 10)

  await createSourceDb({ url, type, pollIntervalMinutes: isNaN(pollIntervalMinutes) ? 60 : pollIntervalMinutes })
  redirect('/admin/sources')
}

/**
 * Server Action: update a source from an HTML form.
 * Form fields: id (hidden), pollIntervalMinutes, healthFailureThreshold, enabled
 * Revalidates /admin/sources on success.
 */
export async function updateSourceForm(formData: FormData): Promise<void> {
  const id = parseInt(formData.get('id')?.toString() ?? '', 10)
  if (isNaN(id)) return

  const pollIntervalMinutes = formData.get('pollIntervalMinutes')
    ? parseInt(formData.get('pollIntervalMinutes')!.toString(), 10)
    : undefined
  const healthFailureThreshold = formData.get('healthFailureThreshold')
    ? parseInt(formData.get('healthFailureThreshold')!.toString(), 10)
    : undefined
  const enabledRaw = formData.get('enabled')
  const enabled = enabledRaw !== null ? enabledRaw === 'true' || enabledRaw === 'on' : undefined

  await updateSourceDb({
    id,
    pollIntervalMinutes: pollIntervalMinutes !== undefined && !isNaN(pollIntervalMinutes) ? pollIntervalMinutes : undefined,
    healthFailureThreshold: healthFailureThreshold !== undefined && !isNaN(healthFailureThreshold) ? healthFailureThreshold : undefined,
    enabled,
  })
  revalidatePath('/admin/sources')
}
