import { describe, it, expect } from 'vitest'
import {
  FACHRICHTUNG_LABELS,
  FACHRICHTUNG_BY_LABEL,
  FACHRICHTUNG_OPTIONS,
} from './fachrichtung-mapping'

describe('fachrichtung-mapping', () => {
  it('FACHRICHTUNG_LABELS has exactly 51 keys', () => {
    expect(Object.keys(FACHRICHTUNG_LABELS).length).toBe(51)
  })

  it('every key in FACHRICHTUNG_LABELS round-trips through FACHRICHTUNG_BY_LABEL', () => {
    for (const [id, label] of Object.entries(FACHRICHTUNG_LABELS)) {
      expect(FACHRICHTUNG_BY_LABEL[label]).toBe(id)
    }
  })

  it('every label is unique across all 51 entries', () => {
    const labels = Object.values(FACHRICHTUNG_LABELS)
    expect(new Set(labels).size).toBe(51)
  })

  it('FACHRICHTUNG_OPTIONS has 51 entries, first is ALLGEMEINMEDIZIN, last is UROLOGIE', () => {
    expect(FACHRICHTUNG_OPTIONS.length).toBe(51)
    expect(FACHRICHTUNG_OPTIONS[0].id).toBe('ALLGEMEINMEDIZIN')
    expect(FACHRICHTUNG_OPTIONS[FACHRICHTUNG_OPTIONS.length - 1].id).toBe('UROLOGIE')
  })

  it('HALS_NASEN_UND_OHRENHEILKUNDE label contains comma-in-quotes value', () => {
    expect(FACHRICHTUNG_LABELS.HALS_NASEN_UND_OHRENHEILKUNDE).toBe(
      'Hals-, Nasen- und Ohrenheilkunde',
    )
  })
})
