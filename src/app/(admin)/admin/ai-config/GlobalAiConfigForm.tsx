import type { AiConfig } from '@prisma/client'
import { upsertAiConfigAction } from '@/lib/admin/ai-config-actions'

interface GlobalAiConfigFormProps {
  config: AiConfig
}

export function GlobalAiConfigForm({ config }: GlobalAiConfigFormProps) {
  return (
    <form action={upsertAiConfigAction} className="space-y-5">
      {/* Ton */}
      <div>
        <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
          Ton
        </label>
        <select
          id="tone"
          name="tone"
          defaultValue={config.tone}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="NEUTRAL">Neutral</option>
          <option value="FORMAL">Formell</option>
          <option value="CONVERSATIONAL">Konversationell</option>
        </select>
      </div>

      {/* Artikellaenge */}
      <div>
        <label htmlFor="articleLength" className="block text-sm font-medium text-gray-700 mb-1">
          Artikellaenge
        </label>
        <select
          id="articleLength"
          name="articleLength"
          defaultValue={config.articleLength}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="SHORT">Kurz (100-150 Woerter)</option>
          <option value="MEDIUM">Mittel (150-250 Woerter)</option>
          <option value="LONG">Lang (250-400 Woerter)</option>
        </select>
      </div>

      {/* Stilhinweise */}
      <div>
        <label htmlFor="styleNotes" className="block text-sm font-medium text-gray-700 mb-1">
          Stilhinweise <span className="text-xs text-gray-600">(optional)</span>
        </label>
        <textarea
          id="styleNotes"
          name="styleNotes"
          rows={3}
          defaultValue={config.styleNotes ?? ''}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="z.B. Erwaehne immer den Bezirk im ersten Satz"
        />
      </div>

      {/* Modell-Override */}
      <div>
        <label htmlFor="modelOverride" className="block text-sm font-medium text-gray-700 mb-1">
          Modell-Override <span className="text-xs text-gray-600">(optional)</span>
        </label>
        <input
          id="modelOverride"
          name="modelOverride"
          type="text"
          defaultValue={config.modelOverride ?? ''}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="leer = Standard (claude-haiku-4-5-20251001)"
        />
      </div>

      <div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}
