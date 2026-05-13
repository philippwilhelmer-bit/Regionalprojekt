import type { BundeslandConfig } from './src/types/bundesland'

export default {
  bundesland: 'steiermark',
  siteName: 'Loden & Leute',
  tagline: 'Nachrichten aus der Steiermark',
  branding: {
    primaryColor: '#1B2D18',
    secondaryColor: '#2D5A27',
    logoPath: '/images/logo-steiermark.svg',
    impressum: {
      publisherName: 'Loden & Leute Medien GmbH',
      address: 'Mustergasse 1, 8940 Liezen, Steiermark',
      email: 'redaktion@lodenundleute.at',
      telefon: 'TODO: +43 XXX XXXXXXX',
      unternehmensgegenstand: 'TODO: Betrieb eines regionalen Nachrichtenportals',
      blattlinie: 'TODO: Blattlinie hier eintragen',
      datenschutzEmail: 'TODO: datenschutz@example.at',
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

export const BEZIRK_COORDS: Record<string, { lat: number; lon: number }> = {
  'graz':                    { lat: 47.07, lon: 15.44 },
  'graz-umgebung':           { lat: 47.07, lon: 15.44 },
  'deutschlandsberg':        { lat: 46.81, lon: 15.21 },
  'hartberg-fuerstenfeld':   { lat: 47.28, lon: 15.97 },
  'leibnitz':                { lat: 46.78, lon: 15.53 },
  'leoben':                  { lat: 47.38, lon: 15.09 },
  'liezen':                  { lat: 47.57, lon: 14.24 },
  'murau':                   { lat: 47.11, lon: 14.17 },
  'murtal':                  { lat: 47.21, lon: 14.69 },
  'bruck-muerzzuschlag':     { lat: 47.41, lon: 15.27 },
  'suedoststeiermark':       { lat: 46.87, lon: 15.83 },
  'voitsberg':               { lat: 47.05, lon: 15.15 },
  'weiz':                    { lat: 47.22, lon: 15.62 },
}
