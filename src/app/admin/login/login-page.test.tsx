import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock bundesland.config
vi.mock('@/../bundesland.config', () => ({
  default: { siteName: 'Test Site' },
}))

// Mock ./login-form to avoid client component issues
vi.mock('./login-form', () => ({
  LoginForm: vi.fn(() => null),
}))

// Import after mocks
import LoginPage from './page'
import { TestSiteBanner } from '@/components/TestSiteBanner'

/**
 * Recursively collect all React element types from a tree.
 * React element = object with { type, props } shape.
 */
function collectElementTypes(node: unknown): Set<unknown> {
  const types = new Set<unknown>()
  if (node === null || node === undefined) return types
  if (Array.isArray(node)) {
    for (const child of node) {
      for (const t of collectElementTypes(child)) types.add(t)
    }
    return types
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if ('type' in obj && 'props' in obj) {
      // This is a React element
      types.add(obj.type)
      for (const t of collectElementTypes(obj.props)) types.add(t)
    } else {
      for (const val of Object.values(obj)) {
        for (const t of collectElementTypes(val)) types.add(t)
      }
    }
  }
  return types
}

function treeContainsString(node: unknown, search: string): boolean {
  if (node === null || node === undefined) return false
  if (typeof node === 'string') return node.includes(search)
  if (Array.isArray(node)) return node.some(c => treeContainsString(c, search))
  if (typeof node === 'object') {
    return Object.values(node as Record<string, unknown>).some(v => treeContainsString(v, search))
  }
  return false
}

describe('LoginPage', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_IS_TEST_SITE
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('includes TestSiteBanner component in output and banner renders with TESTSEITE when env is "true"', () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const result = LoginPage()
    // Verify TestSiteBanner is included in the page tree
    const types = collectElementTypes(result)
    expect(types.has(TestSiteBanner)).toBe(true)
    // Verify TestSiteBanner itself renders the banner
    const bannerResult = TestSiteBanner()
    expect(bannerResult).not.toBeNull()
    expect(bannerResult).toHaveProperty('props.role', 'banner')
    const children = (bannerResult as { props: { children: string } }).props.children
    expect(children).toContain('TESTSEITE')
  })

  it('includes TestSiteBanner component but banner renders null when env is unset', () => {
    const result = LoginPage()
    // TestSiteBanner is always included in the tree
    const types = collectElementTypes(result)
    expect(types.has(TestSiteBanner)).toBe(true)
    // But it renders null without the env var
    const bannerResult = TestSiteBanner()
    expect(bannerResult).toBeNull()
  })

  it('renders h1 with site name in both cases', () => {
    // Without env var
    const result = LoginPage()
    expect(treeContainsString(result, 'Test Site')).toBe(true)

    // With env var
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const resultWithBanner = LoginPage()
    expect(treeContainsString(resultWithBanner, 'Test Site')).toBe(true)
  })
})
