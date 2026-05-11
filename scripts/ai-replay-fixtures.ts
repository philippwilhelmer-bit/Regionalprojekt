#!/usr/bin/env tsx
/**
 * Manual pre-merge replay harness for the Phase 43 merged AI call.
 *
 * Loads every fixture under `src/test/fixtures/ai-merged/`, runs each against
 * the real Anthropic API via `runMergedCall`, asserts the invariants in
 * `expectedOutput` + `contentInvariants`, prints a per-fixture pass/fail line,
 * and exits 0 iff every fixture passes.
 *
 * Designed as the Phase 43 CUTOVER GATE. Any single failure blocks the
 * cutover PR merge (locked decision in `.planning/phases/43-ai-pipeline-quick-wins/43-CONTEXT.md`).
 * Re-running has the same effect (idempotent; some cost in Anthropic tokens).
 *
 * Invocation:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/ai-replay-fixtures.ts
 *
 * Cost: one real Anthropic call per fixture (~20 calls per run).
 *
 * Importable: the `main()` entry point is guarded so that importing
 * `assertFixture` / `Fixture` from this file (the smoke test does this) does
 * NOT trigger any HTTP traffic.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

import { runMergedCall, type MergedResult } from '../src/lib/ai/steps/merged'
import { prisma } from '../src/lib/prisma'

const FIXTURE_DIR = 'src/test/fixtures/ai-merged'

export interface Fixture {
  id: string
  description: string
  sourceType: 'OTS_AT' | 'RSS'
  rawArticleText: string
  expectedOutput: {
    bezirkSlugs: string[]
    isStateWide: boolean
    mentionsPrivateIndividual: boolean
  }
  contentInvariants: {
    headlineMaxChars?: number
    leadMaxSentences?: number
    bodyMustContain?: string[]
    bodyMustNotContain?: string[]
    seoTitleMaxChars: number
    metaDescriptionMaxChars: number
  }
  expectedFinalStatus: 'WRITTEN' | 'REVIEW'
  notes?: string
}

/**
 * Pure invariant-checker. Exported for the smoke test (so the harness's
 * comparison logic can be unit-tested without HTTP).
 *
 * - bezirkSlugs are sorted on BOTH sides before comparison (RESEARCH.md
 *   Pitfall 7: avoids order-flakiness on multi-Bezirk fixtures).
 * - bodyMustContain / bodyMustNotContain are case-insensitive.
 * - SEO length asserts: `length <= max`.
 * - expectedFinalStatus is recomputed from the MergedResult using the same
 *   logic as the pipeline (REVIEW if `mentionsPrivateIndividual ||
 *   (bezirkSlugs.length === 0 && !isStateWide)`, else WRITTEN) and the
 *   derivation must match the fixture's expectedFinalStatus.
 */
export function assertFixture(
  fx: Fixture,
  out: MergedResult,
): { pass: boolean; failures: string[] } {
  const failures: string[] = []

  const outSlugs = [...out.bezirkSlugs].sort()
  const expSlugs = [...fx.expectedOutput.bezirkSlugs].sort()
  if (JSON.stringify(outSlugs) !== JSON.stringify(expSlugs)) {
    failures.push(
      `bezirkSlugs: got ${JSON.stringify(outSlugs)}, expected ${JSON.stringify(expSlugs)}`,
    )
  }
  if (out.isStateWide !== fx.expectedOutput.isStateWide) {
    failures.push(
      `isStateWide: got ${out.isStateWide}, expected ${fx.expectedOutput.isStateWide}`,
    )
  }
  if (out.mentionsPrivateIndividual !== fx.expectedOutput.mentionsPrivateIndividual) {
    failures.push(
      `mentionsPrivateIndividual: got ${out.mentionsPrivateIndividual}, expected ${fx.expectedOutput.mentionsPrivateIndividual}`,
    )
  }
  if (out.seoTitle.length > fx.contentInvariants.seoTitleMaxChars) {
    failures.push(
      `seoTitle ${out.seoTitle.length} chars > ${fx.contentInvariants.seoTitleMaxChars}`,
    )
  }
  if (out.metaDescription.length > fx.contentInvariants.metaDescriptionMaxChars) {
    failures.push(
      `metaDescription ${out.metaDescription.length} chars > ${fx.contentInvariants.metaDescriptionMaxChars}`,
    )
  }
  for (const must of fx.contentInvariants.bodyMustContain ?? []) {
    if (!out.body.toLowerCase().includes(must.toLowerCase())) {
      failures.push(`body missing "${must}"`)
    }
  }
  for (const mustNot of fx.contentInvariants.bodyMustNotContain ?? []) {
    if (out.body.toLowerCase().includes(mustNot.toLowerCase())) {
      failures.push(`body bleed: "${mustNot}"`)
    }
  }

  // Derived final status — must match the pipeline's computeFinalStatus logic.
  const derived =
    out.mentionsPrivateIndividual ||
    (out.bezirkSlugs.length === 0 && !out.isStateWide)
      ? 'REVIEW'
      : 'WRITTEN'
  if (derived !== fx.expectedFinalStatus) {
    failures.push(
      `finalStatus: derived=${derived}, expected=${fx.expectedFinalStatus}`,
    )
  }

  return { pass: failures.length === 0, failures }
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ANTHROPIC_API_KEY is not set. Replay harness requires real Anthropic access.',
    )
    process.exit(2)
  }

  const files = (await readdir(FIXTURE_DIR))
    .filter((f) => f.endsWith('.json'))
    .sort()
  if (files.length === 0) {
    console.error(`No fixture files found in ${FIXTURE_DIR}`)
    process.exit(2)
  }

  const bezirke = await prisma.bezirk.findMany()
  // maxRetries: 2 mirrors the pipeline's _clientFactory.create() shape so the
  // harness exercises the same retry behaviour the production path sees.
  const client = new Anthropic({ maxRetries: 2 })

  const results: Array<{ id: string; pass: boolean; failures: string[] }> = []

  for (const file of files) {
    const fx = JSON.parse(await readFile(join(FIXTURE_DIR, file), 'utf8')) as Fixture
    try {
      const out = await runMergedCall(client, fx.rawArticleText, bezirke, prisma)
      const { pass, failures } = assertFixture(fx, out)
      results.push({ id: fx.id, pass, failures })
    } catch (err) {
      results.push({
        id: fx.id,
        pass: false,
        failures: [
          `runMergedCall threw: ${err instanceof Error ? err.message : String(err)}`,
        ],
      })
    }
  }

  for (const r of results) {
    if (r.pass) {
      console.log(`✓ ${r.id}`)
    } else {
      console.log(`✗ ${r.id}\n    ${r.failures.join('\n    ')}`)
    }
  }
  const passCount = results.filter((r) => r.pass).length
  console.log(`\n${passCount}/${results.length} passed`)
  process.exit(passCount === results.length ? 0 : 1)
}

/**
 * Entry-point guard: `main()` only runs when this file is invoked as the
 * script (via tsx/node), not when it is imported by the smoke test or another
 * module. Detection is filename-based on `process.argv[1]` because tsx runs
 * the project in CommonJS mode (no native `import.meta.main`).
 */
const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  typeof process.argv[1] === 'string' &&
  process.argv[1].endsWith('ai-replay-fixtures.ts')

if (invokedAsScript) {
  main().catch((err) => {
    console.error('Replay harness crashed:', err)
    process.exit(2)
  })
}
