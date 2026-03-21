import { describe, it } from 'vitest'

// Implementation: src/lib/ai/steps/step2-write.ts
// Requirements: AI-01, SEO-02

describe('runStep2Write()', () => {
  it.todo('calls Anthropic API with bezirk context in system prompt')
  it.todo('returns headline, lead, body from structured JSON response')
  it.todo('returns seoTitle (≤60 chars) from structured JSON response (SEO-02)')
  it.todo('returns metaDescription (≤160 chars) from structured JSON response (SEO-02)')
  it.todo('returns token counts (inputTokens, outputTokens)')
  it.todo('throws if no text block in API response')
})
