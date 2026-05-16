import { describe, it, expect } from 'vitest'
import { resolveBezirkName } from './bezirk-alias'

describe('resolveBezirkName', () => {
  it('resolves Graz-Stadt to Graz (Stadt)', () => {
    expect(resolveBezirkName('Graz-Stadt')).toBe('Graz (Stadt)')
  })

  it('passes through Murtal unchanged', () => {
    expect(resolveBezirkName('Murtal')).toBe('Murtal')
  })

  it('passes through Liezen unchanged', () => {
    expect(resolveBezirkName('Liezen')).toBe('Liezen')
  })

  it('passes through an unknown Bezirk unchanged', () => {
    expect(resolveBezirkName('Unknown')).toBe('Unknown')
  })

  it('passes through empty string unchanged', () => {
    expect(resolveBezirkName('')).toBe('')
  })
})
