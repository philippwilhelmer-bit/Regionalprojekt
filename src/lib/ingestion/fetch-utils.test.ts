/**
 * Tests for fetchWithTimeout helper.
 *
 * Requirements:
 *   INGEST-02 — Every external fetch in OTS + RSS adapters carries a 10s AbortSignal.
 *
 * The helper wraps fetch() with an explicit AbortController + setTimeout/clearTimeout.
 * Explicit setTimeout (rather than AbortSignal.timeout()) is used so we can observe
 * controller behavior in tests without relying on SDK internals.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWithTimeout } from './fetch-utils'

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('calls global.fetch exactly once with the URL and a signal', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    await fetchWithTimeout('https://example.test/x')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://example.test/x')
    expect(init).toBeDefined()
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })

  it('clears the timeout when fetch resolves quickly (no leaked timers)', async () => {
    vi.useFakeTimers()
    try {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))

      await fetchWithTimeout('https://example.test/x')

      // After a successful fetch resolution the timer must have been cleared,
      // so advancing past the 10s threshold MUST NOT fire any pending abort.
      // If clearTimeout was missing, the pending timer would fire here.
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('aborts the request and rejects when fetch exceeds 10s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })

    let capturedSignal: AbortSignal | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedSignal = init?.signal ?? undefined
        return new Promise<Response>((_, reject) => {
          // Simulate real fetch: reject when the abort signal fires.
          // attach the handler synchronously so we don't race the abort event.
          if (capturedSignal?.aborted) {
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            )
            return
          }
          capturedSignal?.addEventListener('abort', () => {
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            )
          })
        })
      },
    )

    const promise = fetchWithTimeout('https://example.test/hangs')
    // Attach catch handler BEFORE advancing timers so the rejection is observed
    // synchronously and is not flagged as unhandled.
    const rejection = expect(promise).rejects.toThrow()

    // Advance past the 10s threshold to trigger the AbortController
    await vi.advanceTimersByTimeAsync(10_001)

    await rejection
    expect(capturedSignal?.aborted).toBe(true)
  })

  it('forwards request init headers to fetch', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok'))

    await fetchWithTimeout('https://example.test/x', {
      headers: { foo: 'bar' },
    })

    const [, init] = fetchSpy.mock.calls[0]
    expect((init as RequestInit).headers).toEqual({ foo: 'bar' })
  })
})
