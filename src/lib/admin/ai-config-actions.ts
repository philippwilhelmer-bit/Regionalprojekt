'use server'
/**
 * AI Config Server Actions — FormData wrappers over ai-config-dal.ts
 *
 * These are bound to HTML form actions in the admin AI Config UI.
 * Auth guard is enforced by Next.js middleware on /admin/** routes.
 *
 * Requirements: AICONF-01, AICONF-02
 */
import {
  upsertAiConfig,
  upsertAiSourceConfig,
  deleteAiSourceConfig,
} from './ai-config-dal'
import { revalidatePath } from 'next/cache'
import type { AiConfig, AiSourceConfig } from '@prisma/client'

// ---------------------------------------------------------------------------
// Global AI Config
// ---------------------------------------------------------------------------

/**
 * Server Action: update global AiConfig from form submission.
 * Form fields: tone, articleLength, styleNotes, modelOverride
 */
export async function upsertAiConfigAction(formData: FormData): Promise<void> {
  const tone = formData.get('tone')?.toString() as AiConfig['tone'] | undefined
  const articleLength = formData.get('articleLength')?.toString() as AiConfig['articleLength'] | undefined
  const styleNotes = formData.get('styleNotes')?.toString() || null
  const modelOverride = formData.get('modelOverride')?.toString() || null

  await upsertAiConfig({ tone, articleLength, styleNotes, modelOverride })
  revalidatePath('/admin/ai-config')
}

// ---------------------------------------------------------------------------
// Per-Source AI Overrides
// ---------------------------------------------------------------------------

/**
 * Server Action: create or update a per-source AiSourceConfig override.
 * Form fields: sourceId (hidden), tone, articleLength, styleNotes, modelOverride
 */
export async function upsertAiSourceConfigAction(formData: FormData): Promise<void> {
  const sourceId = parseInt(formData.get('sourceId')?.toString() ?? '', 10)
  if (isNaN(sourceId)) return

  const tone = (formData.get('tone')?.toString() || undefined) as AiSourceConfig['tone'] | undefined
  const articleLength = (formData.get('articleLength')?.toString() || undefined) as AiSourceConfig['articleLength'] | undefined
  const styleNotes = formData.get('styleNotes')?.toString() || null
  const modelOverride = formData.get('modelOverride')?.toString() || null

  await upsertAiSourceConfig({ sourceId, tone, articleLength, styleNotes, modelOverride })
  revalidatePath('/admin/ai-config')
}

/**
 * Server Action: delete a per-source AiSourceConfig, resetting to global defaults.
 * Form fields: sourceId (hidden)
 */
export async function deleteAiSourceConfigAction(formData: FormData): Promise<void> {
  const sourceId = parseInt(formData.get('sourceId')?.toString() ?? '', 10)
  if (isNaN(sourceId)) return

  await deleteAiSourceConfig(sourceId)
  revalidatePath('/admin/ai-config')
}
