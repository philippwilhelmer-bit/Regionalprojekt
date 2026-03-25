export interface AdZone {
  id: 'hero' | 'between-articles' | 'article-detail'
  envVar: string   // name of env var containing AdSense unit ID (NOT the value)
  enabled: boolean
}

export interface BundeslandBranding {
  primaryColor: string   // hex value, e.g. '#154212'
  secondaryColor: string
  logoPath: string
  impressum: {
    publisherName: string
    address: string
    email: string
    telefon: string
    unternehmensgegenstand: string
    blattlinie: string
    datenschutzEmail: string
    uid?: string
  }
}

export interface BezirkItem {
  slug: string
  name: string
}

export interface BundeslandConfig {
  bundesland: string        // lowercase slug, e.g. 'steiermark'
  siteName: string
  tagline: string
  branding: BundeslandBranding
  adZones: AdZone[]
  features: {
    ads: boolean
    rss: boolean
  }
  regions: BezirkItem[]
}
