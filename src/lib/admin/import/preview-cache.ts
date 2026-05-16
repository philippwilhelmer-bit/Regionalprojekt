/**
 * In-memory preview cache for the CSV import dry-run workflow (Plan 47-03).
 *
 * Lives in a separate non-'use server' file so that the helpers are NOT treated
 * as Server Actions by Next.js. The 'use server' doctors-import-actions.ts imports
 * these functions and re-exports the module-scoped Map indirectly via the helpers.
 *
 * Semantics:
 *   - Cache entries expire after 15 minutes (TTL_MS).
 *   - Pruning runs on every read and write (not a background timer — zero infra
 *     footprint, Vercel function lifecycle aligns with single-editor workflow).
 *   - Token: crypto.randomUUID() — 122-bit entropy (T-47-03-CACHE).
 *   - Cold start drops the cache → user re-uploads (D-15, T-47-03-COLD).
 */

import type { ParsedRow, RowConflict } from './csv-parser'

export interface CachedPreview {
  rows: Array<ParsedRow & { bezirkId: number; addressChanged: boolean; isUpdate: boolean }>
  conflicts: RowConflict[]
  createdAt: number
}

const TTL_MS = 15 * 60 * 1000 // 15 minutes

/** Module-scoped — survives within a single warm Vercel function instance. */
export const PREVIEW_CACHE = new Map<string, CachedPreview>()

/** Remove entries older than TTL_MS. Called on every read/write. */
export function pruneExpired(): void {
  const now = Date.now()
  for (const [token, entry] of PREVIEW_CACHE.entries()) {
    if (now - entry.createdAt > TTL_MS) {
      PREVIEW_CACHE.delete(token)
    }
  }
}

/**
 * Store a preview in the cache. Returns the token.
 * Prunes stale entries on every write.
 */
export function setPreview(token: string, entry: Omit<CachedPreview, 'createdAt'>): void {
  pruneExpired()
  PREVIEW_CACHE.set(token, { ...entry, createdAt: Date.now() })
}

/**
 * Retrieve a preview by token. Returns null if not found or expired.
 * Prunes stale entries on every read.
 */
export function getPreview(token: string): CachedPreview | null {
  pruneExpired()
  const entry = PREVIEW_CACHE.get(token)
  if (!entry) return null
  // Double-check TTL after prune (defensive; prune should have removed it)
  if (Date.now() - entry.createdAt > TTL_MS) {
    PREVIEW_CACHE.delete(token)
    return null
  }
  return entry
}
