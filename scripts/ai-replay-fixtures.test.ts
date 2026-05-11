/**
 * Smoke test for the manual replay harness `scripts/ai-replay-fixtures.ts`.
 *
 * Two responsibilities:
 *   1. Validate that every fixture under `src/test/fixtures/ai-merged/` parses
 *      against the `Fixture` schema. This catches schema drift in CI even when
 *      the real Anthropic API is unreachable.
 *   2. Exercise the harness's `assertFixture` invariant-check helper against
 *      synthetic MergedResult objects so the harness logic is itself unit
 *      tested without HTTP.
 *
 * Never hits the real Anthropic API. Runtime is sub-second.
 */
import { describe, it, expect } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { assertFixture, type Fixture } from './ai-replay-fixtures'
import type { MergedResult } from '../src/lib/ai/steps/merged'

const FIXTURE_DIR = 'src/test/fixtures/ai-merged'

describe('ai-replay-fixtures schema + harness logic', () => {
  it('every fixture parses against the Fixture schema', async () => {
    const files = (await readdir(FIXTURE_DIR)).filter((f) => f.endsWith('.json'))
    expect(files.length).toBe(20)

    for (const file of files) {
      const fx = JSON.parse(await readFile(join(FIXTURE_DIR, file), 'utf8')) as Fixture

      expect(fx.id, `fixture file ${file}`).toMatch(/^f\d{2}-/)
      // id must match filename (sans .json)
      expect(file).toBe(`${fx.id}.json`)
      expect(['OTS_AT', 'RSS']).toContain(fx.sourceType)
      expect(['WRITTEN', 'REVIEW']).toContain(fx.expectedFinalStatus)
      expect(typeof fx.rawArticleText).toBe('string')
      expect(fx.rawArticleText.length).toBeGreaterThan(50)
      expect(fx.contentInvariants.seoTitleMaxChars).toBe(60)
      expect(fx.contentInvariants.metaDescriptionMaxChars).toBe(160)

      // Structural sanity: isStateWide=true MUST come with empty bezirkSlugs.
      if (fx.expectedOutput.isStateWide) {
        expect(fx.expectedOutput.bezirkSlugs).toEqual([])
      }

      // The fixture's expectedFinalStatus must match the pipeline's derived
      // status so the harness's `assertFixture` derivation check cannot fail
      // due to an inconsistent fixture rather than a real model regression.
      const e = fx.expectedOutput
      const derived =
        e.mentionsPrivateIndividual ||
        (e.bezirkSlugs.length === 0 && !e.isStateWide)
          ? 'REVIEW'
          : 'WRITTEN'
      expect(derived, `fixture ${fx.id} final-status consistency`).toBe(
        fx.expectedFinalStatus,
      )
    }
  })

  it('assertFixture passes a perfect MergedResult', () => {
    const fx: Fixture = {
      id: 'test-perfect',
      description: 'synthetic',
      sourceType: 'OTS_AT',
      rawArticleText: 'x'.repeat(100),
      expectedOutput: {
        bezirkSlugs: ['graz'],
        isStateWide: false,
        mentionsPrivateIndividual: false,
      },
      contentInvariants: {
        bodyMustContain: ['A2'],
        seoTitleMaxChars: 60,
        metaDescriptionMaxChars: 160,
      },
      expectedFinalStatus: 'WRITTEN',
    }
    const out: MergedResult = {
      bezirkSlugs: ['graz'],
      isStateWide: false,
      mentionsPrivateIndividual: false,
      headline: 'H',
      lead: 'L',
      body: 'On the A2 there was a thing.',
      seoTitle: 'T',
      metaDescription: 'D',
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 1,
    }
    expect(assertFixture(fx, out)).toEqual({ pass: true, failures: [] })
  })

  it('assertFixture catches missing bodyMustContain and metadata bleed', () => {
    const fx: Fixture = {
      id: 'test-bleed',
      description: '',
      sourceType: 'OTS_AT',
      rawArticleText: 'x'.repeat(100),
      expectedOutput: {
        bezirkSlugs: ['graz'],
        isStateWide: false,
        mentionsPrivateIndividual: false,
      },
      contentInvariants: {
        bodyMustContain: ['Knittelfeld'],
        bodyMustNotContain: ['Tel:'],
        seoTitleMaxChars: 60,
        metaDescriptionMaxChars: 160,
      },
      expectedFinalStatus: 'WRITTEN',
    }
    const out: MergedResult = {
      bezirkSlugs: ['graz'],
      isStateWide: false,
      mentionsPrivateIndividual: false,
      headline: 'H',
      lead: 'L',
      body: 'Wrong place. Tel: +43 ...',
      seoTitle: 'T',
      metaDescription: 'D',
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 1,
    }
    const result = assertFixture(fx, out)
    expect(result.pass).toBe(false)
    expect(result.failures.some((f) => f.includes('Knittelfeld'))).toBe(true)
    expect(result.failures.some((f) => f.includes('Tel:'))).toBe(true)
  })

  it('assertFixture derives REVIEW for no-relevance fixture (Phase 43 decision)', () => {
    const fx: Fixture = {
      id: 'test-no-relevance',
      description: '',
      sourceType: 'OTS_AT',
      rawArticleText: 'x'.repeat(100),
      expectedOutput: {
        bezirkSlugs: [],
        isStateWide: false,
        mentionsPrivateIndividual: false,
      },
      contentInvariants: { seoTitleMaxChars: 60, metaDescriptionMaxChars: 160 },
      expectedFinalStatus: 'REVIEW',
    }
    const out: MergedResult = {
      bezirkSlugs: [],
      isStateWide: false,
      mentionsPrivateIndividual: false,
      headline: 'H',
      lead: 'L',
      body: 'B',
      seoTitle: 'T',
      metaDescription: 'D',
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 1,
    }
    expect(assertFixture(fx, out)).toEqual({ pass: true, failures: [] })
  })

  it('assertFixture sorts bezirkSlugs before comparison (multi-Bezirk fixture)', () => {
    const fx: Fixture = {
      id: 'test-multi',
      description: '',
      sourceType: 'OTS_AT',
      rawArticleText: 'x'.repeat(100),
      // Authored order: liezen first
      expectedOutput: {
        bezirkSlugs: ['liezen', 'murau'],
        isStateWide: false,
        mentionsPrivateIndividual: false,
      },
      contentInvariants: { seoTitleMaxChars: 60, metaDescriptionMaxChars: 160 },
      expectedFinalStatus: 'WRITTEN',
    }
    // Model returns reversed order
    const out: MergedResult = {
      bezirkSlugs: ['murau', 'liezen'],
      isStateWide: false,
      mentionsPrivateIndividual: false,
      headline: 'H',
      lead: 'L',
      body: 'B',
      seoTitle: 'T',
      metaDescription: 'D',
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 1,
    }
    expect(assertFixture(fx, out)).toEqual({ pass: true, failures: [] })
  })

  it('assertFixture flags SEO length violations', () => {
    const fx: Fixture = {
      id: 'test-seo',
      description: '',
      sourceType: 'OTS_AT',
      rawArticleText: 'x'.repeat(100),
      expectedOutput: {
        bezirkSlugs: ['graz'],
        isStateWide: false,
        mentionsPrivateIndividual: false,
      },
      contentInvariants: { seoTitleMaxChars: 60, metaDescriptionMaxChars: 160 },
      expectedFinalStatus: 'WRITTEN',
    }
    const out: MergedResult = {
      bezirkSlugs: ['graz'],
      isStateWide: false,
      mentionsPrivateIndividual: false,
      headline: 'H',
      lead: 'L',
      body: 'B',
      seoTitle: 'T'.repeat(80), // > 60
      metaDescription: 'M'.repeat(180), // > 160
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheCreationTokens: 0,
      outputTokens: 1,
    }
    const result = assertFixture(fx, out)
    expect(result.pass).toBe(false)
    expect(result.failures.some((f) => f.includes('seoTitle'))).toBe(true)
    expect(result.failures.some((f) => f.includes('metaDescription'))).toBe(true)
  })
})
