import { describe, it, expect } from 'vitest'
import { adapterRegistry } from './registry'

describe('adapterRegistry', () => {
  it('resolves OTS_AT key to otsAtAdapter function', () => {
    expect(typeof adapterRegistry['OTS_AT']).toBe('function')
  })

  it('resolves RSS key to rssAdapter function', () => {
    expect(typeof adapterRegistry['RSS']).toBe('function')
  })

  it('MANUAL key resolves to undefined (not a polling source)', () => {
    expect(adapterRegistry['MANUAL']).toBeUndefined()
  })
})
