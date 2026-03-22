'use server'
/**
 * AI Config Server Actions — thin wrappers over ai-config-dal.ts
 *
 * These are wired to UI forms in Plans 06/07.
 * Auth guard is enforced by Next.js middleware on /admin/** routes.
 *
 * Requirements: AICONF-01, AICONF-02
 */
import type { AiConfig, AiSourceConfig } from '@prisma/client'
import {
  getAiConfig,
  upsertAiConfig,
  getResolvedAiConfig,
  upsertAiSourceConfig,
  deleteAiSourceConfig,
} from './ai-config-dal'
import type { ResolvedAiConfig } from './ai-config-dal'

export async function getAiConfigAction(): Promise<AiConfig> {
  return getAiConfig()
}

export async function upsertAiConfigAction(
  data: Partial<{
    tone: AiConfig['tone']
    articleLength: AiConfig['articleLength']
    styleNotes: string | null
    modelOverride: string | null
  }>
): Promise<AiConfig> {
  return upsertAiConfig(data)
}

export async function getResolvedAiConfigAction(sourceId: number): Promise<ResolvedAiConfig> {
  return getResolvedAiConfig(sourceId)
}

export async function upsertAiSourceConfigAction(data: {
  sourceId: number
  tone?: AiSourceConfig['tone']
  articleLength?: AiSourceConfig['articleLength']
  styleNotes?: string | null
  modelOverride?: string | null
}): Promise<AiSourceConfig> {
  return upsertAiSourceConfig(data)
}

export async function deleteAiSourceConfigAction(sourceId: number): Promise<void> {
  return deleteAiSourceConfig(sourceId)
}
