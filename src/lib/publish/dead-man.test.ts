/**
 * Dead-Man Monitor Tests — PUB-03
 *
 * Wave 0: stubs only. Implementations filled in Plan 02.
 */
import { describe, it } from 'vitest'
// import { checkDeadMan } from './dead-man'

describe('checkDeadMan()', () => {
  it.todo('emits DEAD_MAN_ALERT console.warn when publishedAt silence exceeds threshold')
  it.todo('does NOT emit alert when last publishedAt is within threshold window')
  it.todo('emits DEAD_MAN_ALERT when no articles have been published yet (NULL publishedAt)')
  it.todo('reads threshold from DEAD_MAN_THRESHOLD_HOURS env var (default 6)')
})
