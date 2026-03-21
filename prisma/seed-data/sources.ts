import type { ArticleSource } from '@prisma/client'

export interface SourceSeedEntry {
  type: ArticleSource
  url: string
  enabled: boolean
  pollIntervalMinutes: number
}

export const steiermarkSources: SourceSeedEntry[] = [
  {
    type: 'OTS_AT',
    url: 'https://www.ots.at/api/liste',
    enabled: true,
    pollIntervalMinutes: 15, // 96 polls/day × ~5 items = ~480 detail calls — safe under 2,500 limit
  },
  // Placeholder RSS source — operator replaces URL via Phase 5 CMS or manual DB update
  {
    type: 'RSS',
    url: 'https://www.kleinezeitung.at/steiermark/rss', // placeholder
    enabled: true,
    pollIntervalMinutes: 30,
  },
]
