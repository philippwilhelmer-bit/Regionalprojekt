/**
 * Import preview component for the CSV import workflow (Phase 47 / DIR-30).
 *
 * Server Component (no 'use client'). Rendered inside /admin/aerzte/import
 * after a successful parse + dry-run. Shows:
 *   - Summary chip (total / new / updates / conflicts)
 *   - Collapsible conflicts table (JS-less via <details>)
 *   - Two-step commit form (JS-less via <details> per DoctorRow pattern)
 *
 * Props come from the PREVIEW_CACHE entry resolved in page.tsx — no direct cache access here.
 */
import { commitCsvImportForm } from '@/lib/admin/doctors-import-actions'
import type { RowConflict } from '@/lib/admin/import/csv-parser'
import { CommitButton } from './CommitButton'

interface PreviewSummary {
  totalRows: number
  newRows: number
  updateRows: number
  conflictCount: number
}

interface ImportPreviewProps {
  token: string
  summary: PreviewSummary
  conflicts: RowConflict[]
}

export function ImportPreview({ token, summary, conflicts }: ImportPreviewProps) {
  const { totalRows, newRows, updateRows, conflictCount } = summary
  const commitCount = newRows + updateRows

  return (
    <div className="mt-dir-md space-y-dir-md">
      {/* Summary chip */}
      <div>
        <span className="bg-dir-tertiary-container text-dir-on-tertiary-container rounded-dir-full px-dir-sm py-dir-xs text-sm font-medium">
          {totalRows} Zeilen: {newRows} neu, {updateRows} Updates, {conflictCount} Konflikte
        </span>
      </div>

      {/* Conflicts table */}
      {conflicts.length > 0 && (
        <details className="bg-dir-surface-container rounded-dir-md p-dir-md">
          <summary className="text-sm font-medium text-dir-on-surface cursor-pointer list-none hover:text-dir-primary">
            {conflictCount} Konflikte anzeigen
          </summary>
          <div className="mt-dir-sm overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-dir-outline-variant">
                  <th className="text-left py-dir-xs pr-dir-sm text-dir-on-surface-variant font-medium text-xs">
                    Zeile
                  </th>
                  <th className="text-left py-dir-xs pr-dir-sm text-dir-on-surface-variant font-medium text-xs">
                    ArztNr
                  </th>
                  <th className="text-left py-dir-xs pr-dir-sm text-dir-on-surface-variant font-medium text-xs">
                    Schweregrad
                  </th>
                  <th className="text-left py-dir-xs text-dir-on-surface-variant font-medium text-xs">
                    Grund
                  </th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((conflict, idx) => (
                  <tr
                    key={idx}
                    className={
                      conflict.severity === 'error'
                        ? 'bg-dir-error-container/30'
                        : 'bg-dir-surface-variant/30'
                    }
                  >
                    <td className="py-dir-xs pr-dir-sm text-dir-on-surface font-mono text-xs">
                      {conflict.csvLineNumber}
                    </td>
                    <td className="py-dir-xs pr-dir-sm text-dir-on-surface font-mono text-xs">
                      {conflict.arztNr ?? '—'}
                    </td>
                    <td className="py-dir-xs pr-dir-sm">
                      <span
                        className={
                          conflict.severity === 'error'
                            ? 'bg-dir-error-container text-dir-on-error-container rounded-dir-full px-dir-xs py-0.5 text-xs'
                            : 'bg-dir-surface-variant text-dir-on-surface-variant rounded-dir-full px-dir-xs py-0.5 text-xs'
                        }
                      >
                        {conflict.severity === 'error' ? 'Fehler' : 'Warnung'}
                      </span>
                    </td>
                    <td className="py-dir-xs text-dir-on-surface text-xs">{conflict.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Commit form — two-step confirm via <details> reveals the actual submit button.
          CommitButton is 'use client' + useFormStatus() so the user sees an "Importiere…"
          disabled state while commitCsvImportForm runs (multi-second DB transaction). */}
      {commitCount > 0 && (
        <form action={commitCsvImportForm}>
          <input type="hidden" name="token" value={token} />
          <details className="inline-block">
            <summary className="px-dir-md py-dir-sm rounded-dir-sm border border-dir-outline-variant text-dir-on-surface-variant text-sm font-medium cursor-pointer list-none hover:bg-dir-surface-variant">
              Import vorbereiten ({commitCount} Zeilen) ▾
            </summary>
            <div className="mt-dir-xs">
              <p className="text-xs text-dir-on-surface-variant mb-dir-xs">
                Diese Aktion importiert {newRows} neue Ärzte und aktualisiert {updateRows}{' '}
                bestehende Einträge. Dieser Vorgang kann nicht rückgängig gemacht werden.
              </p>
              <CommitButton label={`Import bestätigen (${commitCount} Zeilen)`} />
            </div>
          </details>
        </form>
      )}
    </div>
  )
}
