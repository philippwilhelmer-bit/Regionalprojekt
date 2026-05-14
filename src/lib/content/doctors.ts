/**
 * Doctor data access layer (Phase 46 / DIR-03).
 *
 * Read-only DAL for the Ärzteverzeichnis. Write paths (create/update/softDelete/
 * toggleVerified) live in src/lib/admin/doctors-actions.ts per Server-Action-Trinity
 * (Plan 46-02).
 *
 * Production usage (no-arg client): functions use the singleton from src/lib/prisma.ts.
 * Test usage: pass a pglite-backed PrismaClient as the first argument.
 *
 * DI dispatch via duck-typing (`'$connect' in clientOrOptions`) per AGENTS.md —
 * NEVER `instanceof PrismaClient` (breaks vitest module isolation).
 */
import type { Doctor, DoctorKategorie, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

export type DoctorWithBezirk = Doctor & {
  bezirk: { id: number; slug: string; name: string }
}

export interface ListDoctorsOptions {
  bezirkId?: number
  bezirkSlug?: string
  kategorie?: DoctorKategorie
  /** Free-text contains match against fachrichtung, case-insensitive. */
  fachrichtung?: string
  isVerified?: boolean
  limit?: number
  offset?: number
}

export async function listDoctors(options?: ListDoctorsOptions): Promise<DoctorWithBezirk[]>
export async function listDoctors(
  client: PrismaClient,
  options?: ListDoctorsOptions,
): Promise<DoctorWithBezirk[]>
export async function listDoctors(
  clientOrOptions?: PrismaClient | ListDoctorsOptions,
  options?: ListDoctorsOptions,
): Promise<DoctorWithBezirk[]> {
  let db: PrismaClient
  let opts: ListDoctorsOptions

  if (
    clientOrOptions !== null &&
    typeof clientOrOptions === 'object' &&
    '$connect' in clientOrOptions
  ) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as ListDoctorsOptions) ?? {}
  }

  const {
    bezirkId,
    bezirkSlug,
    kategorie,
    fachrichtung,
    isVerified,
    limit = 50,
    offset = 0,
  } = opts

  // Resolve bezirkSlug → bezirkId if necessary. Early-exit on unknown slug
  // so we don't return all doctors when the caller mistypes.
  let resolvedBezirkId = bezirkId
  if (resolvedBezirkId === undefined && bezirkSlug !== undefined) {
    const b = await db.bezirk.findUnique({ where: { slug: bezirkSlug } })
    if (!b) return []
    resolvedBezirkId = b.id
  }

  return db.doctor.findMany({
    where: {
      ...(resolvedBezirkId !== undefined ? { bezirkId: resolvedBezirkId } : {}),
      ...(kategorie !== undefined ? { kategorie } : {}),
      ...(fachrichtung !== undefined
        ? { fachrichtung: { contains: fachrichtung, mode: 'insensitive' } }
        : {}),
      ...(isVerified !== undefined ? { isVerified } : {}),
    },
    include: { bezirk: { select: { id: true, slug: true, name: true } } },
    orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
    take: limit,
    skip: offset,
  })
}

export async function getDoctorByPublicId(publicId: string): Promise<DoctorWithBezirk | null>
export async function getDoctorByPublicId(
  client: PrismaClient,
  publicId: string,
): Promise<DoctorWithBezirk | null>
export async function getDoctorByPublicId(
  clientOrPublicId: PrismaClient | string,
  publicId?: string,
): Promise<DoctorWithBezirk | null> {
  if (typeof clientOrPublicId === 'string') {
    return defaultPrisma.doctor.findUnique({
      where: { publicId: clientOrPublicId },
      include: { bezirk: { select: { id: true, slug: true, name: true } } },
    })
  }
  return clientOrPublicId.doctor.findUnique({
    where: { publicId: publicId! },
    include: { bezirk: { select: { id: true, slug: true, name: true } } },
  })
}

export async function getDoctorById(id: number): Promise<DoctorWithBezirk | null>
export async function getDoctorById(
  client: PrismaClient,
  id: number,
): Promise<DoctorWithBezirk | null>
export async function getDoctorById(
  clientOrId: PrismaClient | number,
  id?: number,
): Promise<DoctorWithBezirk | null> {
  if (typeof clientOrId === 'number') {
    return defaultPrisma.doctor.findUnique({
      where: { id: clientOrId },
      include: { bezirk: { select: { id: true, slug: true, name: true } } },
    })
  }
  return clientOrId.doctor.findUnique({
    where: { id: id! },
    include: { bezirk: { select: { id: true, slug: true, name: true } } },
  })
}
