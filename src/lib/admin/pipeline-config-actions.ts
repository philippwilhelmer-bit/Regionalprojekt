'use server'
/**
 * Pipeline Config Server Actions — thin wrappers over pipeline-config-dal.ts
 *
 * These are wired to the admin Pipeline Config UI in Plans 06/07.
 * Auth guard is enforced by Next.js middleware on /admin/** routes.
 *
 * Requirements: AICONF-03
 */
import type { PipelineConfig } from '@prisma/client'
import { getPipelineConfig, upsertPipelineConfig } from './pipeline-config-dal'

export async function getPipelineConfigAction(): Promise<PipelineConfig> {
  return getPipelineConfig()
}

export async function upsertPipelineConfigAction(
  data: Partial<{
    maxRetryCount: number
    deadManThresholdHours: number
  }>
): Promise<PipelineConfig> {
  return upsertPipelineConfig(data)
}
