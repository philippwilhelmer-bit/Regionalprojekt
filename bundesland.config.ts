import type { BundeslandConfig } from './src/types/bundesland'

export default {
  bundesland: 'steiermark',
  siteName: 'Ennstal Aktuell',
  tagline: 'Nachrichten aus der Steiermark',
  branding: {
    primaryColor: '#154212',
    secondaryColor: '#2d7a1f',
    logoPath: '/images/logo-steiermark.svg',
    impressum: {
      publisherName: 'Ennstal Aktuell Medien GmbH',
      address: 'Mustergasse 1, 8940 Liezen, Steiermark',
      email: 'redaktion@ennstal-aktuell.at',
    },
  },
  adZones: [
    {
      id: 'hero',
      envVar: 'ADSENSE_UNIT_HERO',
      enabled: true,
    },
    {
      id: 'between-articles',
      envVar: 'ADSENSE_UNIT_BETWEEN',
      enabled: true,
    },
    {
      id: 'article-detail',
      envVar: 'ADSENSE_UNIT_DETAIL',
      enabled: true,
    },
  ],
  features: {
    ads: true,
    rss: true,
  },
  regions: [
    { slug: 'graz', name: 'Graz (Stadt)' },
    { slug: 'graz-umgebung', name: 'Graz-Umgebung' },
    { slug: 'deutschlandsberg', name: 'Deutschlandsberg' },
    { slug: 'hartberg-fuerstenfeld', name: 'Hartberg-Fürstenfeld' },
    { slug: 'leibnitz', name: 'Leibnitz' },
    { slug: 'leoben', name: 'Leoben' },
    { slug: 'liezen', name: 'Liezen' },
    { slug: 'murau', name: 'Murau' },
    { slug: 'murtal', name: 'Murtal' },
    { slug: 'bruck-muerzzuschlag', name: 'Bruck-Mürzzuschlag' },
    { slug: 'suedoststeiermark', name: 'Südoststeiermark' },
    { slug: 'voitsberg', name: 'Voitsberg' },
    { slug: 'weiz', name: 'Weiz' },
  ],
} satisfies BundeslandConfig
