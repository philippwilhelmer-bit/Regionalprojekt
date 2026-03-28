import React from 'react'
import config from '@/../bundesland.config'
import { AdUnitClient } from './AdUnitClient'

type AdZone = 'hero' | 'between-articles' | 'article-detail'

interface AdUnitProps {
  zone: AdZone
}

export function AdUnit({ zone }: AdUnitProps) {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') return null
  if (!config.features.ads) return null

  const zoneConfig = config.adZones.find(z => z.id === zone)
  if (!zoneConfig || !zoneConfig.enabled) return null

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID
  const slot = process.env[zoneConfig.envVar]

  return <AdUnitClient pubId={pubId} slot={slot} zone={zone} />
}
