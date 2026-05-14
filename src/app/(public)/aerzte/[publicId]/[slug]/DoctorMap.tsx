/**
 * DoctorMap — Server Component for the static map image (Phase 46 / DIR-08).
 *
 * Renders the pre-generated map image hosted on Vercel Blob (uploaded by
 * Plan 02's doctors-actions). When `mapImageUrl` is null (no geocode yet,
 * or geocode failed silently) we render an address-only fallback card
 * instead of an empty box.
 *
 * Uses native <img> not next/image — matches the article detail pattern
 * (external Blob URL, no remotePatterns config needed).
 */
type Props = {
  mapImageUrl: string | null
  doctorName: string
  address: string
}

export default function DoctorMap({ mapImageUrl, doctorName, address }: Props) {
  if (!mapImageUrl) {
    return (
      <div className="bg-dir-surface-container rounded-dir-md p-dir-md text-dir-on-surface-variant">
        <p className="text-sm">Kartenausschnitt nicht verfügbar.</p>
        <p className="text-sm mt-dir-xs">{address}</p>
      </div>
    )
  }

  return (
    <figure className="rounded-dir-md overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mapImageUrl}
        alt={`Karte zum Standort: ${doctorName}, ${address}`}
        width={1200}
        height={630}
        className="w-full h-auto"
      />
      <figcaption className="text-dir-on-surface-variant text-xs mt-dir-xs">
        © basemap.at
      </figcaption>
    </figure>
  )
}
