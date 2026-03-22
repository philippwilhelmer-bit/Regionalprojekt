import { getAiConfig } from '@/lib/admin/ai-config-dal'
import { getPipelineConfig } from '@/lib/admin/pipeline-config-dal'
import { upsertPipelineConfigAction } from '@/lib/admin/pipeline-config-actions'
import { prisma } from '@/lib/prisma'
import { GlobalAiConfigForm } from './GlobalAiConfigForm'
import { SourceOverrideForm } from './SourceOverrideForm'

export default async function AiConfigPage() {
  const [aiConfig, sources, pipelineConfig] = await Promise.all([
    getAiConfig(),
    prisma.source.findMany({
      orderBy: { id: 'asc' },
      include: { aiSourceConfig: true },
    }),
    getPipelineConfig(),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">KI-Konfiguration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Diese Einstellungen gelten ab dem naechsten Scheduler-Lauf.
        </p>
      </div>

      {/* Section 1: Global AI Settings */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Globale KI-Einstellungen</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <GlobalAiConfigForm config={aiConfig} />
        </div>
      </section>

      {/* Section 2: Per-source overrides */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quellen-Ueberschreibungen</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Quellen konfiguriert.</p>
        ) : (
          <div>
            {sources.map((source) => (
              <SourceOverrideForm
                key={source.id}
                source={{ id: source.id, url: source.url, type: source.type }}
                override={source.aiSourceConfig ?? null}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Pipeline Config */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pipeline-Konfiguration</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form action={upsertPipelineConfigAction} className="space-y-5">
            {/* maxRetryCount */}
            <div>
              <label
                htmlFor="maxRetryCount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Max. Wiederholungsversuche
              </label>
              <input
                id="maxRetryCount"
                name="maxRetryCount"
                type="number"
                min={0}
                defaultValue={pipelineConfig.maxRetryCount}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Anzahl der Versuche, bevor ein Artikel als dauerhaft fehlgeschlagen markiert wird.
              </p>
            </div>

            {/* deadManThresholdHours */}
            <div>
              <label
                htmlFor="deadManThresholdHours"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Dead-Man-Schwelle (Stunden)
              </label>
              <input
                id="deadManThresholdHours"
                name="deadManThresholdHours"
                type="number"
                min={1}
                defaultValue={pipelineConfig.deadManThresholdHours}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximale Zeit ohne neuen Artikel, bevor ein Alert ausgeloest wird.
              </p>
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
        </div>
      </section>
    </div>
  )
}
