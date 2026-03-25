import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
// Implementation: src/lib/ai/steps/step1-tag.ts
// Requirements: AI-02, AI-03

import { runStep1Tag, type Step1Result } from './step1-tag'

// Minimal Bezirk type for tests (mirrors Prisma schema)
type BezirkInput = { slug: string; name: string; gemeindeSynonyms: string[] }

const TEST_BEZIRKE: BezirkInput[] = [
  { slug: 'liezen', name: 'Liezen', gemeindeSynonyms: ['Ennstal', 'Schladming', 'Bad Aussee'] },
  { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: ['Graz', 'Landeshauptstadt'] },
  { slug: 'steiermark-weit', name: 'Steiermark-weit', gemeindeSynonyms: [] },
]

/** Build a minimal text block matching the Anthropic SDK TextBlock shape */
function makeTextBlock(text: string): Anthropic.Messages.TextBlock {
  return { type: 'text', text, citations: null }
}

function makeMockClient(
  responseOverride?: Partial<{
    content: Anthropic.Messages.ContentBlock[]
    usage: { input_tokens: number; output_tokens: number }
  }>
): Anthropic {
  const defaultResponse = {
    content: [
      makeTextBlock(JSON.stringify({ bezirkSlugs: ['liezen'], hasNamedPerson: false })),
    ],
    usage: { input_tokens: 100, output_tokens: 50 },
    ...responseOverride,
  }

  return {
    messages: {
      create: vi.fn().mockResolvedValue(defaultResponse),
    },
  } as unknown as Anthropic
}

describe('runStep1Tag()', () => {
  it('calls Anthropic API with bezirk context in system prompt', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep1Tag(client, 'Ein Artikel über Schladming.', TEST_BEZIRKE)

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(callArgs.system).toContain('liezen')
  })

  it('returns bezirkSlugs array from structured JSON response', async () => {
    const client = makeMockClient({
      content: [makeTextBlock(JSON.stringify({ bezirkSlugs: ['liezen'], hasNamedPerson: false }))],
    })

    const result: Step1Result = await runStep1Tag(client, 'Ein Artikel.', TEST_BEZIRKE)

    expect(result.bezirkSlugs).toEqual(['liezen'])
  })

  it('returns hasNamedPerson boolean from structured JSON response', async () => {
    const client = makeMockClient({
      content: [makeTextBlock(JSON.stringify({ bezirkSlugs: ['liezen'], hasNamedPerson: true }))],
    })

    const result: Step1Result = await runStep1Tag(client, 'Ein Artikel über Max Mustermann.', TEST_BEZIRKE)

    expect(result.hasNamedPerson).toBe(true)
  })

  it('returns token counts (inputTokens, outputTokens)', async () => {
    const client = makeMockClient({
      usage: { input_tokens: 123, output_tokens: 45 },
    })

    const result: Step1Result = await runStep1Tag(client, 'Ein Artikel.', TEST_BEZIRKE)

    expect(result.inputTokens).toBe(123)
    expect(result.outputTokens).toBe(45)
  })

  it('handles empty bezirkSlugs (no geographic match)', async () => {
    const client = makeMockClient({
      content: [makeTextBlock(JSON.stringify({ bezirkSlugs: [], hasNamedPerson: false }))],
    })

    const result: Step1Result = await runStep1Tag(client, 'Ein nationaler Artikel.', TEST_BEZIRKE)

    expect(result.bezirkSlugs).toEqual([])
    expect(result.hasNamedPerson).toBe(false)
  })

  it('throws if no text block in API response', async () => {
    const client = makeMockClient({
      content: [],
    })

    await expect(
      runStep1Tag(client, 'Ein Artikel.', TEST_BEZIRKE)
    ).rejects.toThrow('No text block in response')
  })

  it('calls messages.create with model claude-haiku-4-5-20251001', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep1Tag(client, 'Ein Artikel.', TEST_BEZIRKE)

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
  })

  it('system prompt contains steiermark-weit exclusivity instruction', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep1Tag(client, 'Ein Artikel über ganz Steiermark.', TEST_BEZIRKE)

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(callArgs.system).toContain('exclusive')
    expect(callArgs.system).toContain("do not include any other Bezirk slugs — it is exclusive")
  })

  it('calls messages.create with output_config json_schema format', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep1Tag(client, 'Ein Artikel.', TEST_BEZIRKE)

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((callArgs as any).output_config?.format?.type).toBe('json_schema')
  })
})
