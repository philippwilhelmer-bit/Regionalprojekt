import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'

import { runMergedCall, type MergedResult } from './merged'

type BezirkInput = { slug: string; name: string; gemeindeSynonyms: string[] }

const TEST_BEZIRKE: BezirkInput[] = [
  { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: ['Graz', 'Landeshauptstadt'] },
  { slug: 'liezen', name: 'Liezen', gemeindeSynonyms: ['Liezen', 'Schladming', 'Bad Aussee'] },
  { slug: 'murtal', name: 'Murtal', gemeindeSynonyms: ['Knittelfeld', 'Judenburg'] },
]

const VALID_TOOL_INPUT = {
  bezirkSlugs: ['graz'],
  isStateWide: false,
  mentionsPrivateIndividual: false,
  headline: 'Verkehrsmeldung Graz',
  lead: 'In Graz kommt es zu Verkehrsbehinderungen.',
  body: 'Auf der A2 staut sich der Verkehr nach einem Auffahrunfall.',
  seoTitle: 'Verkehrsbehinderung in Graz',
  metaDescription: 'Auffahrunfall sorgt für Stau auf der A2 bei Graz.',
}

function makeToolUseBlock(input: object) {
  return {
    type: 'tool_use' as const,
    id: 'tool_test_1',
    name: 'publish_article',
    input,
  }
}

function makeMockClient(
  overrides?: Partial<{
    // Loosely typed: the SDK's full ContentBlock union requires fields
    // (e.g. `caller`) that the duck-typed mock omits intentionally. The
    // runtime code reads `b.type` and `b.name` only, so a minimal shape
    // suffices here.
    content: Array<Record<string, unknown>>
    usage: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    stop_reason: Anthropic.Messages.Message['stop_reason']
  }>,
): Anthropic {
  const defaultResponse = {
    content: [makeToolUseBlock(VALID_TOOL_INPUT)],
    usage: { input_tokens: 1500, output_tokens: 400 },
    stop_reason: 'tool_use' as const,
    ...overrides,
  }

  return {
    messages: { create: vi.fn().mockResolvedValue(defaultResponse) },
  } as unknown as Anthropic
}

function makeMockDb(override?: { tone?: string; articleLength?: string; styleNotes?: string | null }): PrismaClient {
  return {
    $connect: vi.fn(),
    aiConfig: {
      findFirst: vi.fn().mockResolvedValue({
        id: 1,
        tone: override?.tone ?? 'NEUTRAL',
        articleLength: override?.articleLength ?? 'MEDIUM',
        styleNotes: override?.styleNotes ?? null,
        modelOverride: null,
        updatedAt: new Date(),
      }),
    },
    aiSourceConfig: { findFirst: vi.fn().mockResolvedValue(null) },
  } as unknown as PrismaClient
}

describe('runMergedCall()', () => {
  it('parses all 8 fields from tool_use block', async () => {
    const client = makeMockClient()
    const db = makeMockDb()

    const result: MergedResult = await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    expect(result.bezirkSlugs).toEqual(['graz'])
    expect(result.isStateWide).toBe(false)
    expect(result.mentionsPrivateIndividual).toBe(false)
    expect(result.headline).toBe('Verkehrsmeldung Graz')
    expect(result.lead).toBe('In Graz kommt es zu Verkehrsbehinderungen.')
    expect(result.body).toContain('A2')
    expect(result.seoTitle).toBe('Verkehrsbehinderung in Graz')
    expect(result.metaDescription).toContain('A2')
  })

  it('uses tools + tool_choice (no output_config cast)', async () => {
    const client = makeMockClient()
    const db = makeMockDb()
    const spy = vi.spyOn(client.messages, 'create')

    await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    const args = spy.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(args.tools).toHaveLength(1)
    expect(args.tools![0].name).toBe('publish_article')
    expect(args.tool_choice).toEqual({ type: 'tool', name: 'publish_article' })
    expect((args as unknown as { output_config?: unknown }).output_config).toBeUndefined()
  })

  it('passes system as array with cache_control on prefix only', async () => {
    const client = makeMockClient()
    const db = makeMockDb()
    const spy = vi.spyOn(client.messages, 'create')

    await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    const args = spy.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(Array.isArray(args.system)).toBe(true)
    const systemBlocks = args.system as Array<{ type: 'text'; text: string; cache_control?: { type: string } }>
    expect(systemBlocks).toHaveLength(2)
    expect(systemBlocks[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(systemBlocks[0].text).toContain('VERFÜGBARE BEZIRKE')
    expect(systemBlocks[1].cache_control).toBeUndefined()
    expect(systemBlocks[1].text).toContain('TON:')
  })

  it('Bezirk list is in static prefix (cacheable), not dynamic suffix', async () => {
    const client = makeMockClient()
    const db = makeMockDb()
    const spy = vi.spyOn(client.messages, 'create')

    await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    const args = spy.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    const [staticBlock, dynamicBlock] = args.system as Array<{ text: string }>
    expect(staticBlock.text).toContain('graz (Graz (Stadt))')
    expect(dynamicBlock.text).not.toContain('graz (')
  })

  it('uses max_tokens 1024', async () => {
    const client = makeMockClient()
    const db = makeMockDb()
    const spy = vi.spyOn(client.messages, 'create')

    await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    const args = spy.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(args.max_tokens).toBe(1024)
  })

  it('throws on stop_reason=max_tokens', async () => {
    const client = makeMockClient({ stop_reason: 'max_tokens' })
    const db = makeMockDb()

    await expect(runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)).rejects.toThrow(/truncated/i)
  })

  it('throws when response has no tool_use block', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: 'oops', citations: null }],
    })
    const db = makeMockDb()

    await expect(runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)).rejects.toThrow(/tool_use/)
  })

  it('defensive guard: isStateWide=true with non-empty bezirkSlugs returns empty bezirkSlugs', async () => {
    const client = makeMockClient({
      content: [
        makeToolUseBlock({
          ...VALID_TOOL_INPUT,
          isStateWide: true,
          bezirkSlugs: ['graz', 'liezen'],
        }),
      ],
    })
    const db = makeMockDb()

    const result = await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    expect(result.isStateWide).toBe(true)
    expect(result.bezirkSlugs).toEqual([])
  })

  it('returns split token counts (input vs cached vs cacheCreation)', async () => {
    const client = makeMockClient({
      usage: {
        input_tokens: 80,
        output_tokens: 400,
        cache_creation_input_tokens: 1500,
        cache_read_input_tokens: 1500,
      },
    })
    const db = makeMockDb()

    const result = await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    expect(result.inputTokens).toBe(80)
    expect(result.cacheCreationTokens).toBe(1500)
    expect(result.cachedInputTokens).toBe(1500)
    expect(result.outputTokens).toBe(400)
  })

  it('treats missing cache_*_tokens fields as 0', async () => {
    const client = makeMockClient({
      usage: { input_tokens: 1500, output_tokens: 400 },
    })
    const db = makeMockDb()

    const result = await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db)

    expect(result.cachedInputTokens).toBe(0)
    expect(result.cacheCreationTokens).toBe(0)
  })

  it('per-source override: FORMAL tone reaches dynamic suffix, not cached prefix', async () => {
    const client = makeMockClient()
    const db = makeMockDb({ tone: 'FORMAL' })
    const spy = vi.spyOn(client.messages, 'create')

    await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db, 42)

    const args = spy.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    const [staticBlock, dynamicBlock] = args.system as Array<{ text: string }>
    expect(dynamicBlock.text).toContain('formell, seriös')
    expect(staticBlock.text).not.toContain('formell, seriös')
  })

  it('styleNotes appear in dynamic suffix when provided', async () => {
    const client = makeMockClient()
    const db = makeMockDb({ styleNotes: 'Nutze immer kurze Sätze.' })
    const spy = vi.spyOn(client.messages, 'create')

    await runMergedCall(client, 'Artikeltext.', TEST_BEZIRKE, db, 42)

    const args = spy.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    const [, dynamicBlock] = args.system as Array<{ text: string }>
    expect(dynamicBlock.text).toContain('ZUSÄTZLICHE ANWEISUNGEN: Nutze immer kurze Sätze.')
  })
})
