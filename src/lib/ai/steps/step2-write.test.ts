import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'

// Implementation: src/lib/ai/steps/step2-write.ts
// Requirements: AI-01, SEO-02

import { runStep2Write, type Step2Result } from './step2-write'

function makeMockClient(
  responseOverride?: Partial<{
    content: Anthropic.Messages.ContentBlock[]
    usage: { input_tokens: number; output_tokens: number }
  }>
): Anthropic {
  const defaultResponse = {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          headline: 'Testüberschrift für Steiermark',
          lead: 'Ein Einstiegssatz zur Nachricht.',
          body: 'Der Haupttext des Artikels mit weiteren Details.',
          seoTitle: 'SEO-Titel für Google',
          metaDescription: 'Eine kurze Meta-Beschreibung für Suchmaschinen unter 160 Zeichen.',
        }),
      },
    ],
    usage: { input_tokens: 200, output_tokens: 150 },
    ...responseOverride,
  }

  return {
    messages: {
      create: vi.fn().mockResolvedValue(defaultResponse),
    },
  } as unknown as Anthropic
}

describe('runStep2Write()', () => {
  it('returns headline, lead, body from structured JSON response', async () => {
    const client = makeMockClient()

    const result: Step2Result = await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    expect(result.headline).toBe('Testüberschrift für Steiermark')
    expect(result.lead).toBe('Ein Einstiegssatz zur Nachricht.')
    expect(result.body).toBe('Der Haupttext des Artikels mit weiteren Details.')
  })

  it('returns seoTitle from structured JSON response (SEO-02)', async () => {
    const client = makeMockClient()

    const result: Step2Result = await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    expect(result.seoTitle).toBe('SEO-Titel für Google')
  })

  it('returns metaDescription from structured JSON response (SEO-02)', async () => {
    const client = makeMockClient()

    const result: Step2Result = await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    expect(result.metaDescription).toBe('Eine kurze Meta-Beschreibung für Suchmaschinen unter 160 Zeichen.')
  })

  it('returns token counts from response.usage', async () => {
    const client = makeMockClient({
      usage: { input_tokens: 200, output_tokens: 150 },
    })

    const result: Step2Result = await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    expect(result.inputTokens).toBe(200)
    expect(result.outputTokens).toBe(150)
  })

  it('throws if no text block in API response', async () => {
    const client = makeMockClient({
      content: [],
    })

    await expect(
      runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])
    ).rejects.toThrow('No text block in response')
  })

  it('calls messages.create with model claude-haiku-4-5-20251001', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
  })

  it('calls messages.create with output_config json_schema format', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((callArgs as any).output_config?.format?.type).toBe('json_schema')
  })

  it('calls messages.create with max_tokens 512', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(callArgs.max_tokens).toBe(512)
  })

  it('injects bezirk names into system prompt', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep2Write(client, 'Rohtext eines Artikels.', ['liezen'])

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(callArgs.system).toContain('liezen')
  })

  it('uses Steiermark-weit fallback when bezirkNames is empty', async () => {
    const client = makeMockClient()
    const mockCreate = vi.spyOn(client.messages, 'create')

    await runStep2Write(client, 'Rohtext eines Artikels.', [])

    const callArgs = mockCreate.mock.calls[0][0] as Anthropic.Messages.MessageCreateParamsNonStreaming
    expect(callArgs.system).toContain('Steiermark-weit')
  })
})
