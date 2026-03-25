/**
 * Computes the display label for the bezirk badge in the reader header.
 *
 * @param slugs - Array of selected bezirk slugs from localStorage, or null/undefined
 * @param bezirke - Available bezirk items for name lookup
 * @returns Display label: "Steiermark" (none), "Graz" (one), "Graz +N" (multiple)
 */
export function computeBezirkLabel(
  slugs: string[] | null | undefined,
  bezirke: { slug: string; name: string }[]
): string {
  if (!slugs || slugs.length === 0) {
    return 'Steiermark';
  }

  const nameMap = Object.fromEntries(bezirke.map(b => [b.slug, b.name]));
  const firstName = nameMap[slugs[0]] ?? slugs[0];

  if (slugs.length > 1) {
    return `${firstName} +${slugs.length - 1}`;
  }

  return firstName;
}
