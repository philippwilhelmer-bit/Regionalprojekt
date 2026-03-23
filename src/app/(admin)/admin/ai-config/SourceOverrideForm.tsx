import type { Source, AiSourceConfig } from '@prisma/client'
import {
  upsertAiSourceConfigAction,
  deleteAiSourceConfigAction,
} from '@/lib/admin/ai-config-actions'

const SOURCE_LABELS: Record<string, string> = {
  OTS_AT: 'OTS.at',
  RSS: 'RSS',
  MANUAL: 'Manuell',
}

interface SourceOverrideFormProps {
  source: Pick<Source, 'id' | 'url' | 'type'>
  override: AiSourceConfig | null
}

export function SourceOverrideForm({ source, override }: SourceOverrideFormProps) {
  const hasOverride = override !== null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
      {/* Source header */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
        <span
          className="text-sm font-mono text-gray-800 truncate max-w-xs"
          title={source.url}
        >
          {source.url}
        </span>
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
          {SOURCE_LABELS[source.type] ?? source.type}
        </span>
        {hasOverride ? (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
            Override aktiv
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            Globale Einstellungen
          </span>
        )}
      </div>

      <div className="px-6 py-4">
        {!hasOverride && (
          <p className="text-sm text-gray-700 mb-3">
            Globale Einstellungen werden verwendet.
          </p>
        )}

        <details open={hasOverride}>
          <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 select-none">
            {hasOverride ? 'Override bearbeiten' : 'Override hinzufuegen'}
          </summary>

          <form action={upsertAiSourceConfigAction} className="mt-4 space-y-4">
            <input type="hidden" name="sourceId" value={source.id} />

            {/* Ton */}
            <div>
              <label
                htmlFor={`tone-${source.id}`}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Ton <span className="text-xs text-gray-600">(leer = global)</span>
              </label>
              <select
                id={`tone-${source.id}`}
                name="tone"
                defaultValue={override?.tone ?? ''}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Globaler Wert —</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="FORMAL">Formell</option>
                <option value="CONVERSATIONAL">Konversationell</option>
              </select>
            </div>

            {/* Artikellaenge */}
            <div>
              <label
                htmlFor={`articleLength-${source.id}`}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Artikellaenge <span className="text-xs text-gray-600">(leer = global)</span>
              </label>
              <select
                id={`articleLength-${source.id}`}
                name="articleLength"
                defaultValue={override?.articleLength ?? ''}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Globaler Wert —</option>
                <option value="SHORT">Kurz (100-150 Woerter)</option>
                <option value="MEDIUM">Mittel (150-250 Woerter)</option>
                <option value="LONG">Lang (250-400 Woerter)</option>
              </select>
            </div>

            {/* Stilhinweise */}
            <div>
              <label
                htmlFor={`styleNotes-${source.id}`}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Stilhinweise <span className="text-xs text-gray-600">(optional)</span>
              </label>
              <textarea
                id={`styleNotes-${source.id}`}
                name="styleNotes"
                rows={2}
                defaultValue={override?.styleNotes ?? ''}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Erwaehne immer den Bezirk im ersten Satz"
              />
            </div>

            {/* Modell-Override */}
            <div>
              <label
                htmlFor={`modelOverride-${source.id}`}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Modell-Override <span className="text-xs text-gray-600">(optional)</span>
              </label>
              <input
                id={`modelOverride-${source.id}`}
                name="modelOverride"
                type="text"
                defaultValue={override?.modelOverride ?? ''}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="leer = Standard (claude-haiku-4-5-20251001)"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </form>

          {/* Remove override */}
          {hasOverride && (
            <form action={deleteAiSourceConfigAction} className="mt-3">
              <input type="hidden" name="sourceId" value={source.id} />
              <button
                type="submit"
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Override entfernen
              </button>
            </form>
          )}
        </details>
      </div>
    </div>
  )
}
