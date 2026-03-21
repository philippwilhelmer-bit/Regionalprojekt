import type { Source } from '@prisma/client'

export interface RawItem {
  externalId: string
  sourceUrl: string
  title: string
  body: string
  publishedAt: Date | null
  rawPayload: unknown
}

export type AdapterFn = (source: Source) => Promise<RawItem[]>
