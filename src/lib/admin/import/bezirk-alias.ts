// Source of truth for canonical Bezirk names: bundesland.config.ts:42-56
// The CSV has one Bezirk name that doesn't exact-match the DB seed:
//   CSV "Graz-Stadt" → DB "Graz (Stadt)" (slug "graz")
// All other 12 Bezirk names match exactly.

const BEZIRK_ALIAS: Record<string, string> = {
  'Graz-Stadt': 'Graz (Stadt)',
}

export function resolveBezirkName(csvName: string): string {
  return BEZIRK_ALIAS[csvName] ?? csvName
}
