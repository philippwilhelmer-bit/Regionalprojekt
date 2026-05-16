/**
 * CSV Import + Batch Geocode Server Actions — Phase 47-03 / DIR-23..DIR-26.
 *
 * Three Server-Action-Trinity triplets:
 *
 * 1. parseAndPreviewCsv{Db,Action,Form}
 *    Accepts CSV text, calls parseDoctorsCsv, resolves Bezirk names → bezirkIds,
 *    classifies rows as new/update, pre-computes addressChanged, caches results
 *    keyed by UUID token, returns {token, summary, conflicts}.
 *
 * 2. commitCsvImport{Db,Action,Form}
 *    Loads cached rows by token, performs all upserts inside a single
 *    db.$transaction([...]) with strict editorial-field allow-list on update
 *    payloads (D-16). Sets lat/lon/mapImageUrl=null when addressChanged=true (D-17).
 *
 * 3. geocodeBatch{Db,Action,Form}
 *    Selects up to 200 doctors WHERE lat IS NULL, geocodes sequentially with
 *    await sleep(1100) between calls (AGENTS.md Nominatim 1 req/s rule, D-21).
 *    maxDuration=300 declared at module top (Vercel 5-min cap, D-21).
 *
 * AGENTS.md rules enforced:
 *   - requireAuth() OUTSIDE any try/catch in all Action/Form wrappers.
 *   - External HTTP (Nominatim via geocodeLocation): silent fallback with console.warn.
 *   - No backwards-compat shims, no unused imports.
 *
 * PREVIEW_CACHE lives in ./import/preview-cache.ts (NOT 'use server') to avoid
 * Next.js treating the helpers as Server Actions (Plan 47-03 Task 1 mitigation).
 */
'use server'
export const maxDuration = 300

import { randomUUID } from 'node:crypto'
import type { Fachrichtung, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'
import { requireAuth } from './auth-node'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'
import { parseDoctorsCsv } from './import/csv-parser'
import type { ParsedRow, RowConflict } from './import/csv-parser'
import { setPreview, getPreview } from './import/preview-cache'
import type { CachedPreview } from './import/preview-cache'

// Re-export cache for testability (tree-shaken from client bundle by @vercel/next)
export { PREVIEW_CACHE } from './import/preview-cache'

// ─── Shared sleep helper ──────────────────────────────────────────────────────
// Exported for testability: tests inject a no-op sleepFn into geocodeBatchDb
// instead of faking global setTimeout (which breaks pglite's internal timers).

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Preview summary types ────────────────────────────────────────────────────

export interface PreviewSummary {
  totalRows: number
  newRows: number
  updateRows: number
  conflictCount: number
}

export interface PreviewResult {
  token: string
  summary: PreviewSummary
  conflicts: RowConflict[]
}

// ─── Trinity 1: parseAndPreviewCsv ───────────────────────────────────────────

/**
 * Pure Db-layer function: parse + validate + enrich CSV rows.
 * No auth — injectable PrismaClient for tests.
 *
 * Enrichment steps:
 *   1. parseDoctorsCsv → {rows, conflicts}
 *   2. Batch-resolve bezirkNames → bezirkIds (ONE findMany query)
 *   3. Batch-resolve existing arztNr rows (ONE findMany query)
 *   4. Pre-compute isUpdate + addressChanged per row
 *   5. Cache enriched rows + conflicts → return token
 */
export async function parseAndPreviewCsvDb(
  db: PrismaClient,
  csvText: string,
): Promise<PreviewResult> {
  const { rows: parsedRows, conflicts: parseConflicts } = parseDoctorsCsv(csvText)

  // Step 2: Batch resolve bezirkNames → bezirkIds
  const distinctBezirkNames = [...new Set(parsedRows.map((r) => r.bezirkName))]
  const bezirkRecords = await db.bezirk.findMany({
    where: { name: { in: distinctBezirkNames } },
    select: { id: true, name: true },
  })
  const bezirkMap = new Map<string, number>(bezirkRecords.map((b) => [b.name, b.id]))

  // Step 3: Batch resolve existing arztNr rows for isUpdate + addressChanged
  const allArztNrs = parsedRows.map((r) => r.arztNr)
  const existingDoctors = await db.doctor.findMany({
    where: { arztNr: { in: allArztNrs } },
    select: { arztNr: true, address: true },
  })
  const existingMap = new Map<string, { address: string }>(
    existingDoctors.map((d) => [d.arztNr, { address: d.address }]),
  )

  // Step 4: Enrich rows, collect unknown-Bezirk conflicts
  const enrichedRows: CachedPreview['rows'] = []
  const enrichConflicts: RowConflict[] = []

  for (const row of parsedRows) {
    const bezirkId = bezirkMap.get(row.bezirkName)
    if (bezirkId === undefined) {
      enrichConflicts.push({
        csvLineNumber: row.csvLineNumber,
        arztNr: row.arztNr,
        reason: `Unbekannter Bezirk: "${row.bezirkName}"`,
        severity: 'error',
      })
      continue
    }

    const existing = existingMap.get(row.arztNr)
    const isUpdate = existing !== undefined
    // D-17: exact string equality — no trim/lowercase
    const addressChanged = isUpdate && existing!.address !== row.address

    enrichedRows.push({ ...row, bezirkId, isUpdate, addressChanged })
  }

  const allConflicts = [...parseConflicts, ...enrichConflicts]

  // Step 5: Cache + return
  const token = randomUUID()
  setPreview(token, { rows: enrichedRows, conflicts: allConflicts })

  const newRows = enrichedRows.filter((r) => !r.isUpdate).length
  const updateRows = enrichedRows.filter((r) => r.isUpdate).length

  return {
    token,
    summary: {
      totalRows: enrichedRows.length,
      newRows,
      updateRows,
      conflictCount: allConflicts.length,
    },
    conflicts: allConflicts,
  }
}

/**
 * Server Action wrapper — requireAuth() FIRST (outside try/catch per AGENTS.md).
 */
export async function parseAndPreviewCsv(csvText: string): Promise<PreviewResult> {
  await requireAuth()
  return parseAndPreviewCsvDb(defaultPrisma, csvText)
}

/**
 * FormData wrapper for <form action={parseAndPreviewCsvForm}>.
 * Reads uploaded file, converts to UTF-8 text, delegates to parseAndPreviewCsv,
 * then redirects to /admin/aerzte/import?token={token}.
 */
export async function parseAndPreviewCsvForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')
  const value = formData.get('file')
  if (!value || typeof value === 'string') {
    throw new Error('Keine CSV-Datei hochgeladen')
  }
  // RESEARCH Anti-Pattern: NOT instanceof File — duck-type check
  if (!('arrayBuffer' in value)) {
    throw new Error('Ungültige Datei')
  }
  const buffer = await value.arrayBuffer()
  const csvText = new TextDecoder('utf-8').decode(buffer)
  const { token } = await parseAndPreviewCsv(csvText)
  redirect('/admin/aerzte/import?token=' + token)
}

// ─── Trinity 2: commitCsvImport ───────────────────────────────────────────────

export interface CommitResult {
  inserted: number
  updated: number
}

/**
 * Pure Db-layer function: perform all upserts in a single db.$transaction([...]).
 *
 * UPDATE payload allow-list (D-16):
 *   name, fachrichtung, address, phone, profilUrl, bezirkId
 *   + conditional: lat=null, lon=null, mapImageUrl=null when addressChanged=true (D-17)
 *
 * NEVER in update payload:
 *   titel, email, editorialNote, relatedArticleIds, isVerified, mapImageUrl (except via address-change)
 *
 * CREATE payload: arztNr, name, fachrichtung, address, phone, profilUrl, bezirkId.
 * DB defaults: lat=null, lon=null, mapImageUrl=null, titel=null, email=null,
 *   editorialNote=null, relatedArticleIds=[], isVerified=false, publicId=nanoid().
 */
export async function commitCsvImportDb(
  db: PrismaClient,
  cachedRows: CachedPreview['rows'],
): Promise<CommitResult> {
  const upsertOps = cachedRows.map((row) =>
    db.doctor.upsert({
      where: { arztNr: row.arztNr },
      create: {
        arztNr: row.arztNr,
        name: row.name,
        fachrichtung: row.fachrichtung,
        address: row.address,
        phone: row.phone,
        profilUrl: row.profilUrl,
        bezirkId: row.bezirkId,
      },
      update: {
        name: row.name,
        fachrichtung: row.fachrichtung,
        address: row.address,
        phone: row.phone,
        profilUrl: row.profilUrl,
        bezirkId: row.bezirkId,
        // D-17: clear geo when address changed
        ...(row.addressChanged ? { lat: null, lon: null, mapImageUrl: null } : {}),
      },
    }),
  )

  await db.$transaction(upsertOps)

  const inserted = cachedRows.filter((r) => !r.isUpdate).length
  const updated = cachedRows.filter((r) => r.isUpdate).length

  return { inserted, updated }
}

/**
 * Server Action wrapper — requireAuth() FIRST.
 * Throws German error if token is expired / not found (Pitfall 3 per RESEARCH).
 */
export async function commitCsvImport(token: string): Promise<CommitResult> {
  await requireAuth()
  const cached = getPreview(token)
  if (cached === null) {
    throw new Error('Vorschau abgelaufen — bitte erneut hochladen')
  }
  return commitCsvImportDb(defaultPrisma, cached.rows)
}

/**
 * FormData wrapper for <form action={commitCsvImportForm}>.
 * Reads token from hidden input, commits, redirects to /admin/aerzte?imported=N.
 */
export async function commitCsvImportForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')
  const token = formData.get('token')?.toString() ?? ''
  const { inserted, updated } = await commitCsvImport(token)
  redirect('/admin/aerzte?imported=' + (inserted + updated))
}

// ─── Trinity 3: geocodeBatch ──────────────────────────────────────────────────

export interface GeocodeBatchResult {
  processed: number
  remaining: number
  failures: number
}

/**
 * Pure Db-layer function: geocode up to 200 doctors with lat=null.
 *
 * Sequential loop with sleepFn(1100) AFTER each geocodeLocation call
 * (AGENTS.md Nominatim rate-limit rule — even cache hits sleep).
 * Per-doctor try/catch: failures are silent (console.warn), loop continues.
 * mapgen failure is also non-fatal: lat/lon still updated, mapImageUrl=null.
 *
 * sleepFn defaults to the module-level sleep(). Tests inject a no-op to avoid
 * waiting 1100ms per doctor (faking global setTimeout breaks pglite internals).
 *
 * Returns {processed, remaining, failures}.
 */
export async function geocodeBatchDb(
  db: PrismaClient,
  sleepFn: (ms: number) => Promise<void> = sleep,
): Promise<GeocodeBatchResult> {
  const candidates = await db.doctor.findMany({
    where: { lat: null },
    select: { id: true, name: true, address: true },
    take: 200, // D-21: cap at 200 (200 × 1.1s = 220s < maxDuration=300)
  })

  let processed = 0
  let failures = 0

  for (const doc of candidates) {
    let geocodeFailed = false
    let geo: Awaited<ReturnType<typeof geocodeLocation>> | null = null

    try {
      geo = await geocodeLocation(db, doc.address)
    } catch (err) {
      geocodeFailed = true
      failures++
      console.warn(`[geocode-batch] failed for doctor=${doc.id}: ${String(err)}`)
    }

    // AGENTS.md: sleep ALWAYS after geocodeLocation (even cache hits, even failures)
    await sleepFn(1100)

    if (geocodeFailed || geo === null) {
      if (!geocodeFailed) failures++ // null result counts as failure
      continue
    }

    let mapImageUrl: string | null = null
    try {
      const map = await generateMapImage(
        geo.lat,
        geo.lon,
        doc.name,
        doc.id,
        geo.locationType,
        { pathPrefix: 'doctor' },
      )
      mapImageUrl = map?.url ?? null
    } catch {
      // mapgen failure is non-fatal — lat/lon still updated, mapImageUrl=null
    }

    await db.doctor.update({
      where: { id: doc.id },
      data: { lat: geo.lat, lon: geo.lon, mapImageUrl },
    })

    processed++
  }

  const remaining = await db.doctor.count({ where: { lat: null } })

  return { processed, remaining, failures }
}

/**
 * Server Action wrapper — requireAuth() FIRST.
 */
export async function geocodeBatchAction(): Promise<GeocodeBatchResult> {
  await requireAuth()
  return geocodeBatchDb(defaultPrisma)
}

/**
 * FormData wrapper for <form action={geocodeBatchForm}>.
 * Calls geocodeBatchAction, redirects to /admin/aerzte?geocoded=N.
 */
export async function geocodeBatchForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')
  const { processed } = await geocodeBatchAction()
  redirect('/admin/aerzte?geocoded=' + processed)
}
