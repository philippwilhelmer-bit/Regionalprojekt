'use server'
// Stub — implementation in GREEN phase

export interface BackfillResult {
  processed: number
  succeeded: number
  failed: number
  skipped: number
}

export async function generateMapForArticle(_articleId: number): Promise<{ url: string; credit: string } | { error: string }> {
  throw new Error('Not implemented')
}

export async function backfillMapImages(): Promise<BackfillResult> {
  throw new Error('Not implemented')
}
