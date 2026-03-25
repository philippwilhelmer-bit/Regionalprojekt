/**
 * Source data access layer.
 *
 * Requirements:
 *   ING-04 — Health tracking: consecutiveFailures, healthStatus, lastSuccessAt
 *   ING-05 — Adapter plug-in contract: listSources supports enabled filter
 *
 * All functions use TypeScript overloads for DI (injected client for tests,
 * singleton for production). Duck-typing via '$connect' check (not instanceof)
 * for vitest module isolation compatibility.
 */
import type { PrismaClient, Source } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

// ─────────────────────────────────────────────
// listSources
// ─────────────────────────────────────────────

export interface ListSourcesOptions {
  enabled?: boolean
}

/** Production overload */
export async function listSources(options?: ListSourcesOptions): Promise<Source[]>
/** Test overload (injected client) */
export async function listSources(
  client: PrismaClient,
  options?: ListSourcesOptions
): Promise<Source[]>
export async function listSources(
  clientOrOptions?: PrismaClient | ListSourcesOptions,
  options?: ListSourcesOptions
): Promise<Source[]> {
  let db: PrismaClient
  let opts: ListSourcesOptions | undefined

  if (
    clientOrOptions !== null &&
    clientOrOptions !== undefined &&
    typeof clientOrOptions === 'object' &&
    '$connect' in clientOrOptions
  ) {
    db = clientOrOptions as PrismaClient
    opts = options
  } else {
    db = defaultPrisma
    opts = clientOrOptions as ListSourcesOptions | undefined
  }

  return db.source.findMany({
    where: opts?.enabled !== undefined ? { enabled: opts.enabled } : undefined,
    orderBy: { id: 'asc' },
  })
}

// ─────────────────────────────────────────────
// getSourceById
// ─────────────────────────────────────────────

/** Production overload */
export async function getSourceById(id: number): Promise<Source | null>
/** Test overload (injected client) */
export async function getSourceById(client: PrismaClient, id: number): Promise<Source | null>
export async function getSourceById(
  clientOrId: PrismaClient | number,
  id?: number
): Promise<Source | null> {
  let db: PrismaClient
  let sourceId: number

  if (
    clientOrId !== null &&
    clientOrId !== undefined &&
    typeof clientOrId === 'object' &&
    '$connect' in clientOrId
  ) {
    db = clientOrId as PrismaClient
    sourceId = id!
  } else {
    db = defaultPrisma
    sourceId = clientOrId as number
  }

  return db.source.findFirst({ where: { id: sourceId } })
}

