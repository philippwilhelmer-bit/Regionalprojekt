/**
 * Tests for the Bezirk content data access layer (bezirke.ts)
 *
 * RED state: listBezirke and getBezirkBySlug don't exist yet.
 * These tests will fail (import error) until Plan 03 implements the DAL.
 *
 * Requirements: CONF-02 — All 13 Steiermark Bezirke queryable after seed.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import type { PrismaClient } from '@prisma/client'

describe('Bezirk DAL (CONF-02)', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
  })

  it.todo('listBezirke() returns exactly 13 entries after seed (CONF-02)')
  it.todo('every Bezirk has a non-empty slug, name, and gemeindeSynonyms array with at least 1 entry (CONF-02)')
  it.todo("getBezirkBySlug('liezen') returns the Liezen Bezirk with synonyms including 'Ennstal' (CONF-02)")
})
