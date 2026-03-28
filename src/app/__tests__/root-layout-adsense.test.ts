import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/font/google
vi.mock('next/font/google', () => ({
  Newsreader: () => ({ variable: 'font-newsreader' }),
  Inter: () => ({ variable: 'font-inter' }),
  Work_Sans: () => ({ variable: 'font-work-sans' }),
}))

// Mock next/script — return a plain object with props so we can inspect it
vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => ({ __scriptProps: props }),
}))

// Mock bundesland.config
vi.mock('@/../bundesland.config', () => ({
  default: { siteName: 'Test Site', features: { ads: true } },
}))

// Mock globals.css import (no-op)
vi.mock('../globals.css', () => ({}))

// Import after mocks
import RootLayout from '../layout'

/**
 * Recursively search a React element tree for any node whose string representation
 * contains the given substring.
 */
function containsString(node: unknown, search: string): boolean {
  if (node === null || node === undefined) return false
  const str = JSON.stringify(node)
  return str.includes(search)
}

describe('RootLayout AdSense gating', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_IS_TEST_SITE
    delete process.env.NEXT_PUBLIC_ADSENSE_PUB_ID
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('does NOT render the AdSense Script tag when NEXT_PUBLIC_IS_TEST_SITE=true', () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID = 'ca-pub-1234567890'
    const result = RootLayout({ children: 'test' })
    expect(containsString(result, 'googlesyndication')).toBe(false)
  })

  it('renders the AdSense Script tag when NEXT_PUBLIC_IS_TEST_SITE is unset', () => {
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID = 'ca-pub-1234567890'
    const result = RootLayout({ children: 'test' })
    expect(containsString(result, 'googlesyndication')).toBe(true)
  })
})
