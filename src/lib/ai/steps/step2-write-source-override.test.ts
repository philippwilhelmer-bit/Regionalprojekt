import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { runStep2Write } from './step2-write'
import { createTestDb, cleanDb } from '../../../test/setup-db'
import type { PrismaClient } from '@prisma/client'

// Implementation target: src/lib/ai/steps/step2-write.ts

const cannedResponse = {
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        headline: 'Test Überschrift',
        lead: 'Test Einstiegssatz.',
        body: 'Test Haupttext.',
        seoTitle: 'Test SEO-Titel',
        metaDescription: 'Test Meta-Beschreibung.',
      }),
    },
  ],
  usage: { input_tokens: 100, output_tokens: 80 },
}

function makeFakeClient(): Anthropic & { messages: { create: ReturnType<typeof vi.fn> } } {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(cannedResponse),
    },
  } as unknown as Anthropic & { messages: { create: ReturnType<typeof vi.fn> } }
}

describe('runStep2Write() — per-source override', () => {
  let db: PrismaClient

  beforeEach(async () => {
    db = await createTestDb()
  })

  afterEach(async () => {
    await cleanDb(db)
  })

  it('uses per-source AiSourceConfig override when sourceId is set', async () => {
    // Arrange: create a Source row
    const src = await db.source.create({
      data: { type: 'OTS_AT', url: 'https://ots.at' },
    })

    // Arrange: create per-source config with override model
    await db.aiSourceConfig.create({
      data: { sourceId: src.id, modelOverride: 'claude-opus-4-5' },
    })

    // Ensure a global AiConfig exists (find-or-create default)
    await db.aiConfig.create({
      data: { tone: 'NEUTRAL', articleLength: 'MEDIUM' },
    })

    const fakeClient = makeFakeClient()

    // Act: call runStep2Write with the source's id
    await runStep2Write(fakeClient, 'Rohtext.', [], db, src.id)

    // Assert: messages.create was called with the per-source override model
    const callArgs = fakeClient.messages.create.mock.calls[0][0] as { model: string }
    expect(callArgs.model).toBe('claude-opus-4-5')
  })

  it('falls through to global AiConfig when sourceId is null/undefined', async () => {
    // Arrange: set a known default model in global AiConfig
    await db.aiConfig.create({
      data: { tone: 'NEUTRAL', articleLength: 'MEDIUM', modelOverride: null },
    })

    const fakeClient = makeFakeClient()

    // Act: call runStep2Write with no sourceId (undefined)
    await runStep2Write(fakeClient, 'Rohtext.', [], db, undefined)

    // Assert: messages.create was called with the hardcoded default model (no modelOverride set)
    const callArgs = fakeClient.messages.create.mock.calls[0][0] as { model: string }
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
  })
})
