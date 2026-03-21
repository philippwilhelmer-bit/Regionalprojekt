/**
 * Seed data for all 13 Steiermark Bezirke.
 * Canonical slugs match the interfaces contract in 01-03-PLAN.md.
 * gemeindeSynonyms are used by AI geo-tagging to match article mentions to Bezirke.
 */

export interface BezirkSeedEntry {
  slug: string
  name: string
  gemeindeSynonyms: string[]
}

export const steiermarkBezirke: BezirkSeedEntry[] = [
  {
    slug: 'graz',
    name: 'Graz (Stadt)',
    gemeindeSynonyms: ['Graz', 'Landeshauptstadt', 'Graz-Stadt', 'LH-Graz'],
  },
  {
    slug: 'graz-umgebung',
    name: 'Graz-Umgebung',
    gemeindeSynonyms: ['Graz-Umgebung', 'Seiersberg', 'Kalsdorf', 'Grambach', 'Lieboch'],
  },
  {
    slug: 'deutschlandsberg',
    name: 'Deutschlandsberg',
    gemeindeSynonyms: ['Deutschlandsberg', 'Stainz', 'Schwanberg', 'Wies'],
  },
  {
    slug: 'hartberg-fuerstenfeld',
    name: 'Hartberg-Fürstenfeld',
    gemeindeSynonyms: ['Hartberg', 'Fürstenfeld', 'Bad Waltersdorf', 'Kaindorf'],
  },
  {
    slug: 'leibnitz',
    name: 'Leibnitz',
    gemeindeSynonyms: ['Leibnitz', 'Gamlitz', 'Ehrenhausen', 'Leutschach', 'Straß in Steiermark'],
  },
  {
    slug: 'leoben',
    name: 'Leoben',
    gemeindeSynonyms: ['Leoben', 'Eisenerz', 'Niklasdorf', 'Trofaiach', 'Donawitz'],
  },
  {
    slug: 'liezen',
    name: 'Liezen',
    gemeindeSynonyms: [
      'Liezen',
      'Ennstal',
      'Schladming',
      'Bad Aussee',
      'Admont',
      'Rottenmann',
      'Gröbming',
      'Irdning',
      'Stainach',
    ],
  },
  {
    slug: 'murau',
    name: 'Murau',
    gemeindeSynonyms: ['Murau', 'Oberwölz', 'Scheifling', 'Stolzalpe'],
  },
  {
    slug: 'murtal',
    name: 'Murtal',
    gemeindeSynonyms: ['Murtal', 'Judenburg', 'Knittelfeld', 'Zeltweg', 'Fohnsdorf'],
  },
  {
    slug: 'bruck-muerzzuschlag',
    name: 'Bruck-Mürzzuschlag',
    gemeindeSynonyms: ['Bruck an der Mur', 'Mürzzuschlag', 'Kapfenberg', 'Kindberg', 'Krieglach'],
  },
  {
    slug: 'suedoststeiermark',
    name: 'Südoststeiermark',
    gemeindeSynonyms: ['Feldbach', 'Bad Gleichenberg', 'Fehring', 'Riegersburg', 'Straden'],
  },
  {
    slug: 'voitsberg',
    name: 'Voitsberg',
    gemeindeSynonyms: ['Voitsberg', 'Köflach', 'Bärnbach', 'Söding', 'Maria Lankowitz'],
  },
  {
    slug: 'weiz',
    name: 'Weiz',
    gemeindeSynonyms: ['Weiz', 'Gleisdorf', 'Anger', 'Birkfeld', 'Passail'],
  },
]
