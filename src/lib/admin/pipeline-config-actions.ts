'use server'
/**
 * Pipeline Config Server Actions — FormData wrappers over pipeline-config-dal.ts
 *
 * These are bound to HTML form actions in the admin AI Config UI (Pipeline section).
 * Auth guard is enforced by Next.js middleware on /admin/** routes.
 *
 * Requirements: AICONF-03
 */
import { upsertPipelineConfig } from './pipeline-config-dal'
import { revalidatePath } from 'next/cache'

/**
 * Server Action: update PipelineConfig from form submission.
 * Form fields: maxRetryCount, deadManThresholdHours
 */
export async function upsertPipelineConfigAction(formData: FormData): Promise<void> {
  const maxRetryCount = parseInt(formData.get('maxRetryCount')?.toString() ?? '', 10)
  const deadManThresholdHours = parseInt(formData.get('deadManThresholdHours')?.toString() ?? '', 10)

  await upsertPipelineConfig({
    maxRetryCount: isNaN(maxRetryCount) ? undefined : maxRetryCount,
    deadManThresholdHours: isNaN(deadManThresholdHours) ? undefined : deadManThresholdHours,
  })
  revalidatePath('/admin/ai-config')
}
