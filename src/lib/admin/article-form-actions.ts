'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '../prisma'
import { requireAuth } from './auth-node'
import { togglePinDb, toggleFeatureDb, softDeleteDb } from './articles-actions'

export async function togglePinAction(formData: FormData): Promise<void> {
  await requireAuth()
  const id = Number(formData.get('id'))
  await togglePinDb(prisma, id)
  revalidatePath('/admin/articles')
}

export async function toggleFeatureAction(formData: FormData): Promise<void> {
  await requireAuth()
  const id = Number(formData.get('id'))
  await toggleFeatureDb(prisma, id)
  revalidatePath('/admin/articles')
}

export async function softDeleteAction(formData: FormData): Promise<void> {
  await requireAuth()
  const id = Number(formData.get('id'))
  await softDeleteDb(prisma, id)
  revalidatePath('/admin/articles')
}
