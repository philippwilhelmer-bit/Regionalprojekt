import type { SourceAdminRow } from '@/lib/admin/sources-actions'
import { updateSourceForm } from '@/lib/admin/sources-actions'
import { SourceFormFields } from './SourceFormFields'

const SOURCE_LABELS: Record<string, string> = {
  OTS_AT: 'OTS.at',
  RSS: 'RSS',
  MANUAL: 'Manuell',
}

const HEALTH_COLORS: Record<string, string> = {
  OK: 'bg-green-100 text-green-700',
  DEGRADED: 'bg-yellow-100 text-yellow-700',
  DOWN: 'bg-red-100 text-red-700',
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'Noch nie'
  return date.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SourceCardProps {
  source: SourceAdminRow
}

export function SourceCard({ source }: SourceCardProps) {
  const healthColor = HEALTH_COLORS[source.healthStatus] ?? 'bg-surface text-ink-muted'

  return (
    <div className="bg-surface-elevated rounded-sm overflow-hidden mb-4">
      {/* Header */}
      <div className="px-6 py-4 bg-surface flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-sm font-mono text-ink truncate max-w-xs"
              title={source.url}
            >
              {source.url}
            </span>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface text-slate">
              {SOURCE_LABELS[source.type] ?? source.type}
            </span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${healthColor}`}>
              {source.healthStatus}
            </span>
            {source.category && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface text-slate">
                {source.category}
              </span>
            )}
            {source.keywords.length > 0 && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface text-slate">
                {source.keywords.length} Stichwörter
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-ink-muted flex-wrap">
            <span>Letzter Erfolg: {formatDateTime(source.lastSuccessAt)}</span>
            {source.latestRun ? (
              <span>
                Letzter Lauf: {source.latestRun.itemsFound ?? 0} gefunden,{' '}
                {source.latestRun.itemsNew ?? 0} neu
              </span>
            ) : (
              <span>Kein Lauf</span>
            )}
            {source.failedErrorCount > 0 && (
              <span className="text-red-600 font-medium">
                {source.failedErrorCount} Artikel fehlgeschlagen
              </span>
            )}
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          {source.enabled ? (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
              Aktiv
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface text-ink-muted">
              Deaktiviert
            </span>
          )}
        </div>
      </div>

      {/* Inline edit form in collapsible details */}
      <details className="px-6 py-3 border-t border-surface">
        <summary className="text-sm text-ink-muted cursor-pointer hover:text-ink select-none">
          Einstellungen bearbeiten
        </summary>
        <form action={updateSourceForm} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={source.id} />

          <div className="grid grid-cols-2 gap-4">
            {/* Poll interval */}
            <div>
              <label
                htmlFor={`poll-${source.id}`}
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Poll-Intervall (Minuten)
              </label>
              <input
                id={`poll-${source.id}`}
                name="pollIntervalMinutes"
                type="number"
                min={1}
                defaultValue={source.pollIntervalMinutes}
                className="w-full border border-surface rounded-sm px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>

            {/* Health failure threshold */}
            <div>
              <label
                htmlFor={`threshold-${source.id}`}
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Fehler-Schwellenwert
              </label>
              <input
                id={`threshold-${source.id}`}
                name="healthFailureThreshold"
                type="number"
                min={1}
                defaultValue={source.healthFailureThreshold}
                className="w-full border border-surface rounded-sm px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>
          </div>

          <SourceFormFields category={source.category} keywords={source.keywords} />

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90"
            >
              Speichern
            </button>
          </div>
        </form>

        {/* Toggle enabled/disabled */}
        <form action={updateSourceForm} className="mt-2">
          <input type="hidden" name="id" value={source.id} />
          <input type="hidden" name="enabled" value={source.enabled ? 'false' : 'true'} />
          <button
            type="submit"
            className={`text-xs underline ${source.enabled ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
          >
            {source.enabled ? 'Quelle deaktivieren' : 'Quelle aktivieren'}
          </button>
        </form>
      </details>
    </div>
  )
}
