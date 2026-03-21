import { describe, it } from 'vitest'

// Implementation: src/lib/ai/steps/step1-tag.ts
// Requirements: AI-02, AI-03

describe('runStep1Tag()', () => {
  it.todo('calls Anthropic API with bezirk context in system prompt')
  it.todo('returns bezirkSlugs array from structured JSON response')
  it.todo('returns hasNamedPerson boolean from structured JSON response')
  it.todo('returns token counts (inputTokens, outputTokens)')
  it.todo('handles empty bezirkSlugs (no geographic match)')
  it.todo('throws if no text block in API response')
})
