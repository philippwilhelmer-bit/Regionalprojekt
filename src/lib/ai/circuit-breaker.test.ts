/**
 * Tests for checkCostCircuitBreaker()
 *
 * Uses pgLite test DB (createTestDb / cleanDb from src/test/setup-db.ts)
 * for full Prisma integration without a running Postgres server.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { checkCostCircuitBreaker, AI_DEFAULT_DAILY_TOKEN_THRESHOLD } from './circuit-breaker'

let db: PrismaClient

beforeAll(async () => {
  db = await createTestDb()
})

afterEach(async () => {
  await cleanDb(db)
  vi.unstubAllEnvs()
})

describe('checkCostCircuitBreaker()', () => {
  it('returns true (proceed) when daily token total is below threshold', async () => {
    await db.pipelineRun.create({
      data: {
        totalInputTokens: 100,
        totalOutputTokens: 50,
      },
    })
    const result = await checkCostCircuitBreaker(db)
    expect(result).toBe(true)
  })

  it('returns true when there are no PipelineRun rows today', async () => {
    const result = await checkCostCircuitBreaker(db)
    expect(result).toBe(true)
  })

  it('returns false (halt) when daily token total meets threshold exactly (500000)', async () => {
    await db.pipelineRun.create({
      data: {
        totalInputTokens: 300_000,
        totalOutputTokens: 200_000,
      },
    })
    const result = await checkCostCircuitBreaker(db)
    expect(result).toBe(false)
  })

  it('returns false when daily token total exceeds threshold (600000 tokens)', async () => {
    await db.pipelineRun.create({
      data: {
        totalInputTokens: 400_000,
        totalOutputTokens: 200_000,
      },
    })
    const result = await checkCostCircuitBreaker(db)
    expect(result).toBe(false)
  })

  it('emits structured console.warn when circuit-breaker fires (AI-04)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await db.pipelineRun.create({
      data: {
        totalInputTokens: 400_000,
        totalOutputTokens: 200_000,
      },
    })
    await checkCostCircuitBreaker(db)
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('CIRCUIT_BREAKER')
    expect(warnSpy.mock.calls[0][0]).toContain('600000')
    warnSpy.mockRestore()
  })

  it('console.warn is NOT emitted when below threshold', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await db.pipelineRun.create({
      data: {
        totalInputTokens: 100,
        totalOutputTokens: 50,
      },
    })
    await checkCostCircuitBreaker(db)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('sums only PipelineRun rows from today (not previous days)', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    await db.pipelineRun.create({
      data: {
        startedAt: yesterday,
        totalInputTokens: 400_000,
        totalOutputTokens: 200_000,
      },
    })
    // Yesterday's tokens should NOT be counted → total = 0 → below threshold → true
    const result = await checkCostCircuitBreaker(db)
    expect(result).toBe(true)
  })

  it('uses AI_DAILY_TOKEN_THRESHOLD env var as threshold', async () => {
    vi.stubEnv('AI_DAILY_TOKEN_THRESHOLD', '1000')
    await db.pipelineRun.create({
      data: {
        totalInputTokens: 1001,
        totalOutputTokens: 0,
      },
    })
    const result = await checkCostCircuitBreaker(db)
    expect(result).toBe(false)
  })

  it('defaults to 500000 tokens when env var is not set', async () => {
    vi.stubEnv('AI_DAILY_TOKEN_THRESHOLD', undefined)
    await db.pipelineRun.create({
      data: {
        totalInputTokens: 499_999,
        totalOutputTokens: 0,
      },
    })
    const result = await checkCostCircuitBreaker(db)
    expect(result).toBe(true)
  })

  it('exports AI_DEFAULT_DAILY_TOKEN_THRESHOLD = 500000', () => {
    expect(AI_DEFAULT_DAILY_TOKEN_THRESHOLD).toBe(500_000)
  })
})
