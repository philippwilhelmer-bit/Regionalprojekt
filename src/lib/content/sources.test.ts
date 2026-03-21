import { describe, it } from 'vitest'
// import { listSources, getSourceById, updateSourceHealth } from './sources'  // uncomment when implemented

describe('listSources', () => {
  it.todo('returns only enabled sources when enabled=true filter passed')
  it.todo('returns all sources when no filter passed')
})

describe('updateSourceHealth', () => {
  it.todo('increments consecutiveFailures and sets healthStatus to DEGRADED at threshold 1')
  it.todo('sets healthStatus to DOWN when consecutiveFailures reaches N')
  it.todo('resets consecutiveFailures to 0 and sets healthStatus to OK on success')
})
