/* CSV parser + per-row validator for the Ärztekammer Steiermark merged CSV.
 * Pure functions — no DB, no auth, no Server Action runtime.
 * Caller is doctors-import-actions.ts.
 */
import Papa from 'papaparse'
import type { Fachrichtung } from '@prisma/client'
import { FACHRICHTUNG_BY_LABEL } from './fachrichtung-mapping'
import { resolveBezirkName } from './bezirk-alias'

const REQUIRED_HEADER = [
  'Bezirk',
  'Fachrichtung',
  'Name',
  'Adresse',
  'Telefonnummer',
  'ArztNr',
  'ProfilURL',
]

export interface ParsedRow {
  arztNr: string // CSV column "ArztNr"
  name: string // CSV column "Name" (preserved as "Last, First" per D-09)
  fachrichtung: Fachrichtung // resolved from CSV "Fachrichtung" via FACHRICHTUNG_BY_LABEL
  bezirkName: string // resolved Bezirk name (post-alias), to be looked up to bezirkId in Plan 47-03
  address: string // CSV "Adresse"
  phone: string | null // CSV "Telefonnummer" or null if empty
  profilUrl: string | null // CSV "ProfilURL" or null if empty
  csvLineNumber: number // 1-based line in source; header=1, first data row=2
}

export interface RowConflict {
  csvLineNumber: number
  arztNr: string | null // null if ArztNr cell was empty
  reason: string // German user-facing message
  severity: 'error' | 'warning' // 'warning' = within-batch dupe (D-18 last-write-wins)
}

export interface ParseResult {
  rows: ParsedRow[] // successfully validated rows
  conflicts: RowConflict[] // rejected rows + warnings
}

export function parseDoctorsCsv(csvText: string): ParseResult {
  // Strip BOM if present (D-07)
  const cleaned = csvText.replace(/^﻿/, '')

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy', // also skips whitespace-only lines
    dynamicTyping: false, // keep all values as strings (Pitfall 4)
  })

  // Fail-fast on header mismatch (D-06)
  const actualHeader = result.meta.fields ?? []
  if (
    actualHeader.length !== REQUIRED_HEADER.length ||
    !REQUIRED_HEADER.every((h, i) => actualHeader[i] === h)
  ) {
    throw new Error(
      `Ungültiger CSV-Header. Erwartet: ${REQUIRED_HEADER.join(',')}. Erhalten: ${actualHeader.join(',')}`,
    )
  }

  // Fail-fast on Quotes/FieldMismatch errors (Pitfall 5)
  const fatalErrors = result.errors.filter(
    (e) => e.type === 'Quotes' || e.type === 'FieldMismatch',
  )
  if (fatalErrors.length > 0) {
    throw new Error(`CSV ist fehlerhaft formatiert: ${fatalErrors[0].message}`)
  }

  const rows: ParsedRow[] = []
  const conflicts: RowConflict[] = []
  const seenArztNr = new Map<string, number>() // arztNr → index in `rows`

  result.data.forEach((row, i) => {
    const lineNumber = i + 2 // +1 for 0-index, +1 for header row

    // Required-field checks (D-08) — check all required fields before anything else
    const requiredFields = ['Bezirk', 'Fachrichtung', 'Name', 'Adresse', 'ArztNr'] as const
    for (const field of requiredFields) {
      if ((row[field] ?? '').trim() === '') {
        const arztNr = field === 'ArztNr' ? null : (row.ArztNr ?? '').trim() || null
        conflicts.push({
          csvLineNumber: lineNumber,
          arztNr,
          reason: `${field} fehlt`,
          severity: 'error',
        })
        return
      }
    }

    const arztNr = row.ArztNr.trim()

    // Bezirk resolution (D-10): resolve alias, pass canonical name through
    // Note: bezirkId lookup happens in Plan 47-03 (csv-parser has no DB access)
    const bezirkName = resolveBezirkName(row.Bezirk.trim())

    // Fachrichtung validation (D-11): validate against enum allow-list
    const fachrichtung = FACHRICHTUNG_BY_LABEL[row.Fachrichtung.trim()]
    if (fachrichtung === undefined) {
      conflicts.push({
        csvLineNumber: lineNumber,
        arztNr,
        reason: `Fachrichtung nicht erkannt: "${row.Fachrichtung}"`,
        severity: 'error',
      })
      return
    }

    // Optional fields (D-08): empty cell → null
    const phone = (row.Telefonnummer ?? '').trim() || null
    const profilUrl = (row.ProfilURL ?? '').trim() || null

    const parsedRow: ParsedRow = {
      arztNr,
      name: row.Name.trim(),
      fachrichtung,
      bezirkName,
      address: row.Adresse.trim(),
      phone,
      profilUrl,
      csvLineNumber: lineNumber,
    }

    // Within-batch dedupe (D-18): last-write-wins
    if (seenArztNr.has(arztNr)) {
      const existingIndex = seenArztNr.get(arztNr)!
      const existingLine = rows[existingIndex].csvLineNumber
      // Replace the earlier entry (last-write-wins)
      rows[existingIndex] = parsedRow
      conflicts.push({
        csvLineNumber: lineNumber,
        arztNr,
        reason: `ArztNr doppelt im Upload (Zeile ${existingLine}) — späterer Eintrag gewinnt`,
        severity: 'warning',
      })
      // Update the index map to point to the same slot (now overwritten)
      seenArztNr.set(arztNr, existingIndex)
    } else {
      seenArztNr.set(arztNr, rows.length)
      rows.push(parsedRow)
    }
  })

  return { rows, conflicts }
}
