/**
 * Admin CSV import page for the doctor directory (Phase 47 / DIR-27, DIR-30).
 *
 * Token-driven two-step flow:
 *  1. No token → show file upload form posting to parseAndPreviewCsvForm.
 *  2. Token present → read from PREVIEW_CACHE, render ImportPreview.
 *     If token is stale/missing: German error chip, prompt re-upload.
 *
 * Server Component. No requireAuth() here — (admin)/layout.tsx gates /admin/*.
 */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { parseAndPreviewCsvForm } from '@/lib/admin/doctors-import-actions'
import { getPreview } from '@/lib/admin/import/preview-cache'
import { ImportPreview } from './ImportPreview'

interface SearchParams {
  token?: string
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const token = sp?.token

  let previewContent: React.ReactNode = null

  if (token) {
    const cached = getPreview(token)
    if (cached === null) {
      previewContent = (
        <div className="mt-dir-md">
          <span className="bg-dir-error-container text-dir-on-error-container rounded-dir-full px-dir-sm py-dir-xs text-sm">
            Vorschau abgelaufen — bitte erneut hochladen
          </span>
        </div>
      )
    } else {
      const newRows = cached.rows.filter((r) => !r.isUpdate).length
      const updateRows = cached.rows.length - newRows
      const totalRows = cached.rows.length
      const conflictCount = cached.conflicts.length

      previewContent = (
        <ImportPreview
          token={token}
          summary={{ totalRows, newRows, updateRows, conflictCount }}
          conflicts={cached.conflicts}
        />
      )
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-dir-md mb-dir-md">
        <Link href="/admin/aerzte" className="text-sm text-ink-muted hover:text-ink">
          &larr; Zurück
        </Link>
        <h1 className="text-2xl font-bold text-ink font-headline">CSV importieren</h1>
      </div>

      <div className="bg-dir-surface-container-lowest rounded-dir-md p-dir-md">
        <p className="text-sm text-dir-on-surface-variant mb-dir-md">
          CSV-Datei mit Ärztedaten hochladen. Erwartete Spalten:{' '}
          <code className="text-xs bg-dir-surface-container rounded px-1">
            Bezirk, Fachrichtung, Name, Adresse, Telefonnummer, ArztNr, ProfilURL
          </code>
        </p>
        <form
          action={parseAndPreviewCsvForm}
          encType="multipart/form-data"
          className="flex items-center gap-dir-sm"
        >
          <input
            type="file"
            name="file"
            accept=".csv"
            required
            className="text-sm text-dir-on-surface file:mr-dir-sm file:py-dir-xs file:px-dir-sm file:rounded-dir-sm file:border file:border-dir-outline-variant file:text-xs file:bg-dir-surface-container file:text-dir-on-surface hover:file:bg-dir-surface-container-high"
          />
          <button
            type="submit"
            className="px-dir-md py-dir-sm bg-dir-primary text-dir-on-primary text-sm font-medium rounded-dir-sm hover:opacity-90"
          >
            Vorschau erzeugen
          </button>
        </form>
      </div>

      {previewContent}
    </div>
  )
}
