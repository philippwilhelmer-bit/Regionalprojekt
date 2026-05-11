/**
 * Unit tests for extractOts — strips OTS metadata from rawPayload.
 *
 * Requirements:
 *   AIPL-06 — Source-typed extractors produce clean LLM-input text.
 */
import { describe, it, expect } from 'vitest'
import { extractOts } from './ots'

describe('extractOts', () => {
  it('strips OTS metadata fields from output', () => {
    const rawPayload = {
      TITEL: 'Großbrand bei Knittelfeld gelöscht',
      TEXT: 'Knittelfeld - Ein Großbrand auf einem landwirtschaftlichen Anwesen wurde nach mehreren Stunden gelöscht.',
      EMITTENT: 'Feuerwehr Knittelfeld',
      WEBLINK: 'https://example.at/foo',
      OTSKEY: 'OTS0123',
      ZEITSTEMPEL: '20260315T100000',
      UTL: 'Pressestelle',
      DATUM: '20260315',
      ZEIT: '10:00',
    }

    const output = extractOts(rawPayload)

    // Must contain body content
    expect(output).toContain('Großbrand')
    expect(output).toContain('Knittelfeld')
    expect(output).toContain('Anwesen')

    // Must NOT contain metadata field names or values
    expect(output).not.toContain('OTS0123')
    expect(output).not.toContain('WEBLINK')
    expect(output).not.toContain('EMITTENT')
    expect(output).not.toContain('ZEITSTEMPEL')
    expect(output).not.toContain('UTL')
    expect(output).not.toContain('DATUM')
    expect(output).not.toContain('ZEIT')
    expect(output).not.toContain('https://example.at')
    // EMITTENT value "Feuerwehr Knittelfeld" appears only as metadata, never as body text
    expect(output).not.toContain('Feuerwehr Knittelfeld')
  })

  it('strips Rückfragen & Kontakt block when present in body text', () => {
    const rawPayload = {
      TITEL: 'Einsatzbericht der Freiwilligen Feuerwehr',
      TEXT:
        'Bei einem Brandeinsatz konnte ein Schaden verhindert werden. Die Mannschaft war rasch vor Ort.\n\n' +
        'Rückfragen & Kontakt:\n' +
        'Freiwillige Feuerwehr Knittelfeld\n' +
        'Kommandant Hans Berger\n' +
        'Tel: +43 3577 12345\n' +
        'E-Mail: kdt@ff-knittelfeld.at',
    }

    const output = extractOts(rawPayload)

    // Body content survives
    expect(output).toContain('Brandeinsatz')
    expect(output).toContain('Mannschaft')

    // Contact block markers must all be gone
    expect(output).not.toContain('Rückfragen')
    expect(output).not.toContain('Tel:')
    expect(output).not.toContain('+43')
    expect(output).not.toContain('E-Mail')
    expect(output).not.toContain('@ff-')
    expect(output).not.toContain('Kommandant')
    expect(output).not.toContain('Hans Berger')
    expect(output).not.toContain('Pressekontakt')
    expect(output).not.toContain('Aussender')
  })

  it('includes TITEL as a heading and body as the remainder joined with double newline', () => {
    const rawPayload = {
      TITEL: 'Schlagzeile',
      TEXT: 'Body content.',
    }

    const output = extractOts(rawPayload)

    expect(output.startsWith('Schlagzeile')).toBe(true)
    expect(output).toContain('Schlagzeile\n\nBody content.')
  })

  it('falls back to the title/content args when rawPayload has no TEXT/BODY/INHALT field', () => {
    const output = extractOts({}, 'Foo', 'Bar')

    expect(output).toBe('Foo\n\nBar')
  })

  it('tolerates non-object rawPayload', () => {
    const output = extractOts('plain string', 'T', 'C')

    expect(output).toBe('T\n\nC')
    expect(() => extractOts(null)).not.toThrow()
    expect(() => extractOts(undefined)).not.toThrow()
    expect(() => extractOts(42)).not.toThrow()
  })
})
