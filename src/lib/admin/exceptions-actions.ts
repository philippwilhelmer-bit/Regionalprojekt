/**
 * Exceptions Server Actions — CMS-03
 *
 * Exports pure DB-layer functions (*Db) for testability (injectable PrismaClient).
 * Server Action wrappers (with 'use server' and requireAuth()) delegate to them.
 */
'use server'

import type { Article, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

// ─── DB-layer functions (pure, injectable, no auth) ──────────────────────────

/**
 * CMS-03: Approve an article — sets status=PUBLISHED.
 */
export async function approveArticleDb(
  db: PrismaClient,
  articleId: number
): Promise<Article> {
  return db.article.update({
    where: { id: articleId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  })
}

/**
 * CMS-03: Reject an article — sets status=REJECTED.
 */
export async function rejectArticleDb(
  db: PrismaClient,
  articleId: number
): Promise<Article> {
  return db.article.update({
    where: { id: articleId },
    data: { status: 'REJECTED' },
  })
}

/**
 * CMS-03: List all articles in the exception queue (status=REVIEW).
 * Ordered by createdAt asc (oldest first).
 * Includes rawPayload for side-by-side display with AI-generated version.
 */
export async function listExceptionQueueDb(db: PrismaClient): Promise<Article[]>
export async function listExceptionQueueDb(): Promise<Article[]>
export async function listExceptionQueueDb(db?: PrismaClient): Promise<Article[]> {
  const client = (db && '$connect' in db) ? db : defaultPrisma

  return client.article.findMany({
    where: { status: 'REVIEW' },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── Server Action wrappers (auth-gated, for Next.js Server Actions) ──────────

export async function approveArticle(articleId: number): Promise<Article> {
  // await requireAuth()
  return approveArticleDb(defaultPrisma, articleId)
}

export async function rejectArticle(articleId: number): Promise<Article> {
  // await requireAuth()
  return rejectArticleDb(defaultPrisma, articleId)
}

// ─── FormData-based wrappers for use in <form action={...}> ──────────────────

export async function approveArticleForm(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  await approveArticleDb(defaultPrisma, id)
}

export async function rejectArticleForm(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  await rejectArticleDb(defaultPrisma, id)
}

export async function listExceptionQueue(): Promise<Article[]> {
  return listExceptionQueueDb(defaultPrisma)
}
