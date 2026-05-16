/**
 * Doctors Server Actions — Phase 47 / DIR-14..DIR-17.
 *
 * Updated from Phase 46: fachrichtung is now a required Fachrichtung enum (not String?).
 * The old DoctorKategorie column and field are removed (D-03). arztNr (required, unique)
 * and profilUrl (D-02 rename) are added (D-01, D-02).
 *
 * Server-Action-Trinity for the Ärzteverzeichnis:
 *   - *Db functions: pure, injectable PrismaClient, no auth — testable.
 *   - Server Actions (`createDoctor`, `updateDoctor`, `toggleVerified`,
 *     `softDeleteDoctor`): wrap *Db with `requireAuth()` and (where relevant)
 *     geocoding + map generation orchestration.
 *   - *Form wrappers: parse FormData, delegate to the typed Server Actions,
 *     then `revalidatePath()` or `redirect()`.
 *
 * Geocode + mapgen orchestration (createDoctor / updateDoctor only):
 *   - Both calls are independent try/catch'd. Neither may block the save.
 *   - Failure path: row persists with `lat=null, lon=null, mapImageUrl=null`.
 *   - Plan 03's admin edit page surfaces this as a non-blocking warning block.
 *
 * Two-phase create: the map asset path needs a stable doctor ID, but the ID
 * is auto-assigned by Postgres on insert. We INSERT first with null geo, then
 * geocode + mapgen using the now-known ID, then UPDATE with geo + mapImageUrl.
 *
 * AGENTS.md rules:
 *   - `requireAuth()` is OUTSIDE try/catch (throws NEXT_REDIRECT — catching breaks the redirect).
 *   - try/catch ONLY around external calls with concrete known error cases.
 *   - No backwards-compat shims.
 *   - `'use server'` file-level directive — every export is either a Server Action
 *     or a Db-layer function exported for testing.
 */
'use server'

import type { Doctor, Fachrichtung, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'
import { requireAuth } from './auth-node'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateDoctorInput {
  arztNr: string
  name: string
  titel?: string
  fachrichtung: Fachrichtung
  address: string
  bezirkId: number
  email?: string
  profilUrl?: string
  phone?: string
  editorialNote?: string
  relatedArticleIds?: string[]
}

export interface UpdateDoctorInput {
  id: number
  arztNr?: string
  name?: string
  titel?: string | null
  fachrichtung?: Fachrichtung
  address?: string
  bezirkId?: number
  email?: string | null
  profilUrl?: string | null
  phone?: string | null
  editorialNote?: string | null
  relatedArticleIds?: string[]
}

export interface GeoResult {
  lat: number
  lon: number
  locationType?: string
}

// ─── Db-layer functions (pure, injectable, no auth) ──────────────────────────

/**
 * Insert a Doctor row. Geo + mapImageUrl are optional — pass them once geocoding
 * has produced results. `publicId` is auto-populated by Prisma `@default(nanoid())`,
 * `isVerified` defaults to false at the DB level, `relatedArticleIds` defaults to [].
 */
export async function createDoctorDb(
  db: PrismaClient,
  input: CreateDoctorInput,
  geo?: GeoResult,
  mapImageUrl?: string | null,
): Promise<Doctor> {
  return db.doctor.create({
    data: {
      arztNr: input.arztNr,
      name: input.name,
      titel: input.titel,
      fachrichtung: input.fachrichtung,
      address: input.address,
      bezirkId: input.bezirkId,
      email: input.email,
      profilUrl: input.profilUrl ?? null,
      phone: input.phone,
      editorialNote: input.editorialNote,
      relatedArticleIds: input.relatedArticleIds ?? [],
      lat: geo?.lat ?? null,
      lon: geo?.lon ?? null,
      mapImageUrl: mapImageUrl ?? null,
    },
  })
}

/**
 * Patch a Doctor row. Only fields present in `input` are written; omitted
 * fields are preserved.
 *
 * `geo` is tri-state:
 *   - `undefined` → preserve existing lat/lon
 *   - `null` → explicitly clear lat/lon to null
 *   - `GeoResult` → set lat/lon from the object
 *
 * Same tri-state semantics for `mapImageUrl`:
 *   - `undefined` → preserve existing value
 *   - `null` → clear to null
 *   - `string` → write the URL
 */
export async function updateDoctorDb(
  db: PrismaClient,
  input: UpdateDoctorInput,
  geo?: GeoResult | null,
  mapImageUrl?: string | null,
): Promise<Doctor> {
  const { id, ...fields } = input
  const data: Record<string, unknown> = { ...fields }
  if (geo !== undefined) {
    data.lat = geo === null ? null : geo.lat
    data.lon = geo === null ? null : geo.lon
  }
  if (mapImageUrl !== undefined) {
    data.mapImageUrl = mapImageUrl
  }
  return db.doctor.update({ where: { id }, data })
}

/**
 * Flip `isVerified` on the given Doctor. Throws if the id does not exist.
 */
export async function toggleVerifiedDb(
  db: PrismaClient,
  doctorId: number,
): Promise<Doctor> {
  const current = await db.doctor.findUniqueOrThrow({ where: { id: doctorId } })
  return db.doctor.update({
    where: { id: doctorId },
    data: { isVerified: !current.isVerified },
  })
}

/**
 * Hard-delete the Doctor row. Name kept as `softDelete*` for API symmetry with
 * articles — Doctor has no status enum, so the operation is a real delete.
 */
export async function softDeleteDoctorDb(
  db: PrismaClient,
  doctorId: number,
): Promise<void> {
  await db.doctor.delete({ where: { id: doctorId } })
}

// ─── Internal: geocode + mapgen orchestration ─────────────────────────────────

/**
 * Run Nominatim geocoding + static map generation for a doctor address.
 *
 * Both external calls are independent try/catch'd. Neither may throw — the
 * caller may save the row even if geocoding or map generation fails.
 *
 * Note on `generateMapImage`: it already catches internally and returns null,
 * but the defensive try/catch here covers new error classes from sharp / blob
 * library updates.
 */
async function geocodeAndMap(
  address: string,
  name: string,
  doctorId: number,
): Promise<{ geo: GeoResult | null; mapImageUrl: string | null }> {
  let geo: GeoResult | null = null
  try {
    const result = await geocodeLocation(defaultPrisma, address)
    if (result) {
      geo = { lat: result.lat, lon: result.lon, locationType: result.locationType }
    }
  } catch (err) {
    console.warn(`[doctors-actions] geocode failed for "${address}": ${String(err)}`)
  }

  let mapImageUrl: string | null = null
  if (geo) {
    try {
      const map = await generateMapImage(
        geo.lat,
        geo.lon,
        name,
        doctorId,
        geo.locationType,
        { pathPrefix: 'doctor' },
      )
      if (map) mapImageUrl = map.url
    } catch (err) {
      console.warn(`[doctors-actions] mapgen threw for doctor=${doctorId}: ${String(err)}`)
    }
  }

  return { geo, mapImageUrl }
}

// ─── Server Action wrappers (auth-gated) ──────────────────────────────────────

/**
 * Two-phase create:
 *   1. INSERT the row with null geo so we have a stable doctor.id for the Blob path.
 *   2. Geocode + mapgen using the now-known id.
 *   3. UPDATE with geo + mapImageUrl iff either succeeded.
 *
 * If both geocode and mapgen fail, the row stays as the null-geo Phase-1 row —
 * Plan 03's admin edit page will surface a warning block.
 */
export async function createDoctor(input: CreateDoctorInput): Promise<Doctor> {
  await requireAuth()
  const created = await createDoctorDb(defaultPrisma, input)
  const { geo, mapImageUrl } = await geocodeAndMap(input.address, input.name, created.id)
  if (geo || mapImageUrl) {
    return updateDoctorDb(
      defaultPrisma,
      { id: created.id },
      geo ?? undefined,
      mapImageUrl ?? undefined,
    )
  }
  return created
}

/**
 * Patch a Doctor. Re-geocodes only if the address field changed; otherwise
 * preserves lat/lon/mapImageUrl as-is.
 */
export async function updateDoctor(input: UpdateDoctorInput): Promise<Doctor> {
  await requireAuth()
  const prev = await defaultPrisma.doctor.findUniqueOrThrow({ where: { id: input.id } })
  const addressChanged = input.address !== undefined && input.address !== prev.address

  if (!addressChanged) {
    return updateDoctorDb(defaultPrisma, input)
  }

  const { geo, mapImageUrl } = await geocodeAndMap(
    input.address!,
    input.name ?? prev.name,
    input.id,
  )
  return updateDoctorDb(defaultPrisma, input, geo ?? null, mapImageUrl ?? null)
}

export async function toggleVerified(doctorId: number): Promise<Doctor> {
  await requireAuth()
  return toggleVerifiedDb(defaultPrisma, doctorId)
}

export async function softDeleteDoctor(doctorId: number): Promise<void> {
  await requireAuth()
  return softDeleteDoctorDb(defaultPrisma, doctorId)
}

// ─── FormData-based wrappers for <form action={...}> ─────────────────────────

function parseRelatedArticleIds(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function createDoctorForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')
  const relatedArticleIds = parseRelatedArticleIds(
    formData.get('relatedArticleIds')?.toString(),
  )
  await createDoctor({
    arztNr: formData.get('arztNr')?.toString() ?? '',
    name: formData.get('name')?.toString() ?? '',
    titel: formData.get('titel')?.toString() || undefined,
    fachrichtung: formData.get('fachrichtung')?.toString() as Fachrichtung,
    address: formData.get('address')?.toString() ?? '',
    bezirkId: Number(formData.get('bezirkId')),
    email: formData.get('email')?.toString() || undefined,
    profilUrl: formData.get('profilUrl')?.toString() || undefined,
    phone: formData.get('phone')?.toString() || undefined,
    editorialNote: formData.get('editorialNote')?.toString() || undefined,
    relatedArticleIds,
  })
  redirect('/admin/aerzte')
}

export async function updateDoctorForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')
  const id = Number(formData.get('id'))
  const relatedArticleIds = parseRelatedArticleIds(
    formData.get('relatedArticleIds')?.toString(),
  )
  await updateDoctor({
    id,
    arztNr: formData.get('arztNr')?.toString() || undefined,
    name: formData.get('name')?.toString() || undefined,
    titel: formData.get('titel')?.toString() || undefined,
    fachrichtung:
      (formData.get('fachrichtung')?.toString() as Fachrichtung | undefined) ||
      undefined,
    address: formData.get('address')?.toString() || undefined,
    bezirkId: formData.get('bezirkId')
      ? Number(formData.get('bezirkId'))
      : undefined,
    email: formData.get('email')?.toString() || undefined,
    profilUrl: formData.get('profilUrl')?.toString() || undefined,
    phone: formData.get('phone')?.toString() || undefined,
    editorialNote: formData.get('editorialNote')?.toString() || undefined,
    relatedArticleIds,
  })
  redirect(`/admin/aerzte/${id}/edit`)
}

export async function toggleVerifiedForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { revalidatePath } = await import('next/cache')
  const id = Number(formData.get('id'))
  await toggleVerifiedDb(defaultPrisma, id)
  revalidatePath('/admin/aerzte')
}

export async function softDeleteDoctorForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')
  const id = Number(formData.get('id'))
  await softDeleteDoctorDb(defaultPrisma, id)
  redirect('/admin/aerzte')
}
