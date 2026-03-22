import { describe, it } from 'vitest'

describe('getAiConfig (global singleton)', () => {
  it.todo('returns default row when none exists (find-or-create)')
  it.todo('returns existing row when already created')
})

describe('upsertAiConfig', () => {
  it.todo('creates singleton row on first call')
  it.todo('updates existing singleton row on subsequent calls')
})

describe('getResolvedAiConfig (per-source merge)', () => {
  it.todo('returns global defaults when no per-source override exists')
  it.todo('overrides tone when AiSourceConfig.tone is set')
  it.todo('overrides articleLength when AiSourceConfig.articleLength is set')
  it.todo('falls through to global for null override fields')
})

describe('upsertAiSourceConfig', () => {
  it.todo('creates AiSourceConfig row linked to sourceId')
  it.todo('updates existing row on second upsert for same sourceId')
})

describe('getPipelineConfig (pipeline singleton)', () => {
  it.todo('returns default row (maxRetryCount=3, deadManThresholdHours=6) when none exists')
  it.todo('returns existing row values when already set')
})

describe('pipeline reads AiConfig at run start', () => {
  it.todo('processArticles reads AiConfig — no hardcoded prompt used')
})
