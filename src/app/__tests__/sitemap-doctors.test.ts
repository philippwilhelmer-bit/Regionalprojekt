import { describe, it, expect } from 'vitest'
import { buildDoctorSitemapEntries } from '../sitemap'

describe('buildDoctorSitemapEntries', () => {
  const baseUrl = 'https://x.example'

  it('returns empty array for zero doctors', () => {
    expect(buildDoctorSitemapEntries([], baseUrl)).toEqual([])
  })

  it('maps doctor to URL with publicId + slugify(name)', () => {
    const entries = buildDoctorSitemapEntries(
      [{ publicId: 'abc123', name: 'Dr. Maria Müller', updatedAt: new Date('2026-05-01') }],
      baseUrl,
    )
    expect(entries).toHaveLength(1)
    expect(entries[0].url).toBe('https://x.example/aerzte/abc123/dr-maria-mueller')
  })

  it('sets priority 0.7 and weekly changeFrequency', () => {
    const entries = buildDoctorSitemapEntries(
      [{ publicId: 'x', name: 'Foo', updatedAt: new Date('2026-01-01') }],
      baseUrl,
    )
    expect(entries[0].priority).toBe(0.7)
    expect(entries[0].changeFrequency).toBe('weekly')
  })

  it('passes through updatedAt as lastModified', () => {
    const ts = new Date('2026-05-13T12:00:00Z')
    const entries = buildDoctorSitemapEntries(
      [{ publicId: 'x', name: 'Foo', updatedAt: ts }],
      baseUrl,
    )
    expect(entries[0].lastModified).toBe(ts)
  })

  it('maps multiple doctors in order', () => {
    const entries = buildDoctorSitemapEntries(
      [
        { publicId: 'a', name: 'Alpha', updatedAt: new Date() },
        { publicId: 'b', name: 'Beta', updatedAt: new Date() },
        { publicId: 'c', name: 'Gamma', updatedAt: new Date() },
      ],
      baseUrl,
    )
    expect(entries.map(e => e.url)).toEqual([
      'https://x.example/aerzte/a/alpha',
      'https://x.example/aerzte/b/beta',
      'https://x.example/aerzte/c/gamma',
    ])
  })
})
