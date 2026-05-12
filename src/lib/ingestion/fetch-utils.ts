/**
 * Shared fetch helpers for ingestion adapters.
 *
 * Requirements:
 *   INGEST-02 — Every external HTTP call in the ingestion path carries a 10s
 *               AbortSignal so a stalled remote can never wedge the cron job.
 *
 * Design notes:
 *   - Uses explicit AbortController + setTimeout/clearTimeout rather than
 *     AbortSignal.timeout(). The explicit form is testable: we can spy on
 *     clearTimeout and assert the controller's signal toggled to aborted.
 *   - try/finally (not try/catch) is intentional. Rejections from fetch
 *     (network error, AbortError) propagate to the caller; the only finally
 *     responsibility is releasing the pending setTimeout handle.
 */

/** Per-request timeout for external HTTP calls in the ingestion path. */
const FETCH_TIMEOUT_MS = 10_000

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}
