import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseDoctorsCsv } from './csv-parser'

// Minimal valid row for inline test inputs (all required fields, valid enum, known Bezirk)
const VALID_HEADER = 'Bezirk,Fachrichtung,Name,Adresse,Telefonnummer,ArztNr,ProfilURL'
const VALID_ROW = 'Graz-Stadt,Allgemeinmedizin,"Mustermann, Maria","Hauptplatz 1, 8010 Graz",+43 316 123456,A0001,https://www.aekstmk.or.at/aerztesuche-46?arztnr=A0001'

describe('parseDoctorsCsv — header', () => {
  it('accepts a CSV with the exact required header', () => {
    const csv = `${VALID_HEADER}\n${VALID_ROW}`
    expect(() => parseDoctorsCsv(csv)).not.toThrow()
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.conflicts).toHaveLength(0)
  })

  it('throws with Ungültiger CSV-Header when header columns are wrong', () => {
    const csv = `A,B,C,D,E,F,G\nval1,val2,val3,val4,val5,val6,val7`
    expect(() => parseDoctorsCsv(csv)).toThrow(/Ungültiger CSV-Header/)
  })

  it('throws when header has fewer columns than required', () => {
    const csv = `Bezirk,Fachrichtung,Name\nGraz-Stadt,Allgemeinmedizin,"Mustermann, Maria"`
    expect(() => parseDoctorsCsv(csv)).toThrow(/Ungültiger CSV-Header/)
  })
})

describe('parseDoctorsCsv — BOM', () => {
  it('accepts a CSV with a UTF-8 BOM prefix and resolves Bezirk alias correctly', () => {
    const csvWithBom = `﻿${VALID_HEADER}\nGraz-Stadt,Allgemeinmedizin,"Huber, Johann","Schillerplatz 4, 8010 Graz",+43 316 111111,A0099,`
    expect(() => parseDoctorsCsv(csvWithBom)).not.toThrow()
    const result = parseDoctorsCsv(csvWithBom)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].bezirkName).toBe('Graz (Stadt)')
  })
})

describe('parseDoctorsCsv — multi-line quoted values', () => {
  it('parses a row with a comma-inside-quotes Fachrichtung as a single row', () => {
    const csv = `${VALID_HEADER}\nMurtal,"Hals-, Nasen- und Ohrenheilkunde","Mustermann, Maria","Hauptplatz 1, 8750 Judenburg",+43 3572 12345,A0001,`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.conflicts).toHaveLength(0)
    expect(result.rows[0].fachrichtung).toBe('HALS_NASEN_UND_OHRENHEILKUNDE')
  })
})

describe('parseDoctorsCsv — required fields', () => {
  it('rejects a row missing Name with error conflict', () => {
    // Name cell is empty (two commas with nothing between)
    const csv = `${VALID_HEADER}\nGraz-Stadt,Allgemeinmedizin,,"Hauptplatz 1, 8010 Graz",+43 316 123456,A0001,`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(0)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].reason).toBe('Name fehlt')
    expect(result.conflicts[0].severity).toBe('error')
  })

  it('rejects a row missing ArztNr with arztNr:null in conflict', () => {
    // ArztNr cell is empty (trailing comma before ProfilURL)
    const csv = `${VALID_HEADER}\nGraz-Stadt,Allgemeinmedizin,"Mustermann, Maria","Hauptplatz 1, 8010 Graz",+43 316 123456,,`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(0)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].reason).toBe('ArztNr fehlt')
    expect(result.conflicts[0].severity).toBe('error')
    expect(result.conflicts[0].arztNr).toBeNull()
  })

  it('rejects a row missing Bezirk', () => {
    const csv = `${VALID_HEADER}\n,Allgemeinmedizin,"Mustermann, Maria","Hauptplatz 1, 8010 Graz",+43 316 123456,A0001,`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(0)
    expect(result.conflicts[0].reason).toBe('Bezirk fehlt')
    expect(result.conflicts[0].severity).toBe('error')
  })
})

describe('parseDoctorsCsv — unknown Fachrichtung', () => {
  it('rejects a row with an unknown Fachrichtung label', () => {
    const csv = `${VALID_HEADER}\nGraz-Stadt,Zauberei,"Mustermann, Maria","Hauptplatz 1, 8010 Graz",+43 316 123456,A0001,`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(0)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].reason).toMatch(/Fachrichtung nicht erkannt/)
    expect(result.conflicts[0].severity).toBe('error')
  })
})

describe('parseDoctorsCsv — Bezirk passthrough', () => {
  it('passes through a known Bezirk name unchanged', () => {
    const csv = `${VALID_HEADER}\nMurtal,Allgemeinmedizin,"Huber, Anna","Bahnhofstraße 12, 8750 Judenburg",+43 3572 12345,A0001,`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].bezirkName).toBe('Murtal')
  })

  it('passes through an unknown Bezirk name unchanged (DB validation is in Plan 47-03)', () => {
    const csv = `${VALID_HEADER}\nUnknownBezirk,Allgemeinmedizin,"Test, Person","Teststraße 1, 1234 Testort",+43 123 456,A0001,`
    const result = parseDoctorsCsv(csv)
    // csv-parser does NOT reject unknown Bezirk names — that is Plan 47-03's job
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].bezirkName).toBe('UnknownBezirk')
  })
})

describe('parseDoctorsCsv — dedupe', () => {
  it('handles within-batch duplicate arztNr with last-write-wins and a warning conflict', () => {
    const row1 = 'Graz-Stadt,Allgemeinmedizin,"Erster, Eintrag","Erste Str. 1, 8010 Graz",+43 316 111111,A0001,'
    const row2 = 'Murtal,Innere Medizin,"Zweiter, Eintrag","Zweite Str. 2, 8750 Judenburg",+43 3572 222222,A0001,'
    const csv = `${VALID_HEADER}\n${row1}\n${row2}`
    const result = parseDoctorsCsv(csv)

    // Only one row kept (last-write-wins)
    expect(result.rows).toHaveLength(1)
    // The kept row is from the LATER entry
    expect(result.rows[0].name).toBe('Zweiter, Eintrag')
    expect(result.rows[0].bezirkName).toBe('Murtal')

    // Exactly one warning conflict
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].severity).toBe('warning')
    expect(result.conflicts[0].reason).toMatch(/ArztNr doppelt im Upload/)
    expect(result.conflicts[0].arztNr).toBe('A0001')
  })
})

describe('parseDoctorsCsv — fixture', () => {
  it('parses the 10-row aerzte-sample.csv fixture with 10 rows and 0 conflicts', () => {
    const csvText = readFileSync('test/fixtures/aerzte-sample.csv', 'utf-8')
    const result = parseDoctorsCsv(csvText)
    expect(result.rows).toHaveLength(10)
    expect(result.conflicts).toHaveLength(0)

    // At least one Graz-Stadt alias row resolved to canonical name
    const grazRow = result.rows.find((r) => r.bezirkName === 'Graz (Stadt)')
    expect(grazRow).toBeDefined()

    // At least one HNO row with correct enum value
    const hnoRow = result.rows.find((r) => r.fachrichtung === 'HALS_NASEN_UND_OHRENHEILKUNDE')
    expect(hnoRow).toBeDefined()
  })
})

describe('parseDoctorsCsv — optional empty cells', () => {
  it('treats empty Telefonnummer as null', () => {
    // Telefonnummer cell is empty (two consecutive commas around it)
    const csv = `${VALID_HEADER}\nGraz-Stadt,Allgemeinmedizin,"Mustermann, Maria","Hauptplatz 1, 8010 Graz",,A0001,https://example.com`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].phone).toBeNull()
  })

  it('treats empty ProfilURL as null', () => {
    // ProfilURL is the last column; empty = trailing comma or nothing
    const csv = `${VALID_HEADER}\nGraz-Stadt,Allgemeinmedizin,"Mustermann, Maria","Hauptplatz 1, 8010 Graz",+43 316 123456,A0001,`
    const result = parseDoctorsCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].profilUrl).toBeNull()
  })
})
