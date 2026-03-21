/**
 * Tests for the Bezirk content data access layer (bezirke.ts)
 *
 * Requirements: CONF-02 — All 13 Steiermark Bezirke queryable after seed.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { seedBezirke } from '../../../prisma/seed'
import type { PrismaClient } from '@prisma/client'
import { listBezirke, getBezirkBySlug, getBezirkById } from './bezirke'

describe('Bezirk DAL (CONF-02)', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
    // Seed once for the whole suite — queries are read-only
    await seedBezirke(prisma, 'steiermark')
  })

  beforeEach(async () => {
    // Do not clean between tests here since we seed once in beforeAll
    // Tests are read-only queries
  })

  it('listBezirke() returns exactly 13 entries after seed (CONF-02)', async () => {
    const bezirke = await listBezirke(prisma)
    expect(bezirke).toHaveLength(13)
  })

  it('every Bezirk has a non-empty slug, name, and gemeindeSynonyms array with at least 1 entry (CONF-02)', async () => {
    const bezirke = await listBezirke(prisma)
    for (const bezirk of bezirke) {
      expect(bezirk.slug).toBeTruthy()
      expect(bezirk.name).toBeTruthy()
      expect(bezirk.gemeindeSynonyms.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("getBezirkBySlug('liezen') returns the Liezen Bezirk with synonyms including 'Ennstal' (CONF-02)", async () => {
    const bezirk = await getBezirkBySlug(prisma, 'liezen')
    expect(bezirk).not.toBeNull()
    expect(bezirk!.name).toBe('Liezen')
    expect(bezirk!.gemeindeSynonyms).toContain('Ennstal')
  })

  it("getBezirkBySlug('nonexistent') returns null — no crash (defensive DAL)", async () => {
    const bezirk = await getBezirkBySlug(prisma, 'nonexistent')
    expect(bezirk).toBeNull()
  })

  it('getBezirkById(id) returns the matching Bezirk (slot check)', async () => {
    const bezirke = await listBezirke(prisma)
    const firstId = bezirke[0].id
    const bezirk = await getBezirkById(prisma, firstId)
    expect(bezirk).not.toBeNull()
    expect(bezirk!.id).toBe(firstId)
  })
})
