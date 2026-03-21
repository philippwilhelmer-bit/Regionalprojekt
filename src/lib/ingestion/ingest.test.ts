import { describe, it } from 'vitest'
// import { ingest } from '../ingest'  // uncomment when implemented

describe('ingest()', () => {
  it.todo('creates an IngestionRun record at start and closes it on success')
  it.todo('increments consecutiveFailures when adapter throws')
  it.todo('sets healthStatus to DEGRADED after 1-2 failures')
  it.todo('sets healthStatus to DOWN after N consecutive failures (threshold 3)')
  it.todo('resets consecutiveFailures to 0 and updates lastSuccessAt on success')
  it.todo('skips duplicate items (isDuplicate returns true) and does not write to Article table')
  it.todo('writes Article with status FETCHED for new non-duplicate items')
  it.todo('records error string in IngestionRun.error when adapter throws')
})
