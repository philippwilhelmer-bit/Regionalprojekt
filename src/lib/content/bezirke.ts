/**
 * Bezirk data access layer.
 *
 * Production usage (no-arg form): import { listBezirke } from './bezirke' and call without args.
 * Test usage (client injection): pass a pgLite-backed PrismaClient as the first argument.
 * This keeps the public interface clean while making the DAL fully testable without mocking.
 */
import type { Bezirk } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

export async function listBezirke(): Promise<Bezirk[]>
export async function listBezirke(client: PrismaClient): Promise<Bezirk[]>
export async function listBezirke(client?: PrismaClient): Promise<Bezirk[]> {
  const db = client ?? defaultPrisma
  return db.bezirk.findMany({
    orderBy: { name: 'asc' },
  })
}

export async function getBezirkBySlug(slug: string): Promise<Bezirk | null>
export async function getBezirkBySlug(client: PrismaClient, slug: string): Promise<Bezirk | null>
export async function getBezirkBySlug(
  clientOrSlug: PrismaClient | string,
  slug?: string
): Promise<Bezirk | null> {
  if (typeof clientOrSlug === 'string') {
    return defaultPrisma.bezirk.findUnique({ where: { slug: clientOrSlug } })
  }
  return clientOrSlug.bezirk.findUnique({ where: { slug: slug! } })
}

export async function getBezirkById(id: number): Promise<Bezirk | null>
export async function getBezirkById(client: PrismaClient, id: number): Promise<Bezirk | null>
export async function getBezirkById(
  clientOrId: PrismaClient | number,
  id?: number
): Promise<Bezirk | null> {
  if (typeof clientOrId === 'number') {
    return defaultPrisma.bezirk.findUnique({ where: { id: clientOrId } })
  }
  return clientOrId.bezirk.findUnique({ where: { id: id! } })
}
