import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('converts ä → ae, ö → oe, ü → ue, ß → ss', () => {
    expect(slugify('Graz: Neue Straßenbahn für Öffi-Nutzer')).toBe(
      'graz-neue-strassenbahn-fuer-oeffi-nutzer'
    )
  })

  it('lowercases all text', () => {
    expect(slugify('Liezen Unwetter-Warnung 2024')).toBe('liezen-unwetter-warnung-2024')
  })

  it('replaces spaces and special chars with hyphens', () => {
    expect(slugify('Ärger über Lärm in Fürstenfeld')).toBe('aerger-ueber-laerm-in-fuerstenfeld')
  })

  it('collapses multiple hyphens into one', () => {
    expect(slugify('Schöne Grüße aus Österreich')).toBe('schoene-gruesse-aus-oesterreich')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello')
  })

  it('handles empty string input', () => {
    expect(slugify('')).toBe('')
  })
})
