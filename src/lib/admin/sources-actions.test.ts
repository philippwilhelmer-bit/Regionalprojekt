import { describe, it } from 'vitest'

describe('createSource', () => {
  it.todo('creates Source row with url, type, and default healthFailureThreshold=3')
})

describe('updateSource', () => {
  it.todo('updates pollIntervalMinutes and healthFailureThreshold')
  it.todo('sets enabled=false when disabling')
})

describe('listSourcesAdmin', () => {
  it.todo('returns sources with latest IngestionRun stats and FAILED+ERROR article counts')
})
