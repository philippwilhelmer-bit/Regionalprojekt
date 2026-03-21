/**
 * Cost Circuit-Breaker for AI Pipeline
 *
 * Queries today's cumulative token usage from PipelineRun and halts AI generation
 * (returning false) with a structured console.warn alert when the daily threshold
 * is reached.
 *
 * Requirements: AI-04
 */
import { PrismaClient } from '@prisma/client'

/** Default daily token threshold (500,000 tokens) */
export const AI_DEFAULT_DAILY_TOKEN_THRESHOLD = 500_000

/**
 * Checks whether today's token usage is below the configured daily threshold.
 *
 * @param db - PrismaClient instance (accepts any duck-typed client for test DI)
 * @returns true if generation should proceed (below threshold), false if halted (threshold met/exceeded)
 */
export async function checkCostCircuitBreaker(db: PrismaClient): Promise<boolean> {
  const threshold = parseInt(
    process.env.AI_DAILY_TOKEN_THRESHOLD ?? String(AI_DEFAULT_DAILY_TOKEN_THRESHOLD),
    10
  )

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const agg = await db.pipelineRun.aggregate({
    where: { startedAt: { gte: todayStart } },
    _sum: {
      totalInputTokens: true,
      totalOutputTokens: true,
    },
  })

  const totalTokens =
    (agg._sum.totalInputTokens ?? 0) + (agg._sum.totalOutputTokens ?? 0)

  if (totalTokens >= threshold) {
    console.warn(
      `[ai-pipeline] CIRCUIT_BREAKER totalTokens=${totalTokens} threshold=${threshold} — halting AI generation`
    )
    return false
  }

  return true
}
