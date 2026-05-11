/**
 * Merged AI Call (Phase 43-01)
 *
 * Single tool_use Anthropic call that replaces step1-tag + step2-write. Returns
 * an 8-field structured result (3 tagging fields + 5 writing/SEO fields) plus a
 * cache-aware token split.
 *
 * Design highlights (see .planning/drafts/43-01-merged-prompt-DRAFT.md for full
 * rationale):
 *   - tools + tool_choice path (typed access to `tool_use.input`, replaces
 *     the legacy untyped JSON-schema cast used in step1-tag.ts)
 *   - System prompt as two-block array: static prefix (role + rules + Bezirk
 *     list) carries `cache_control: {type: 'ephemeral'}`; dynamic suffix
 *     (tone/length/styleNotes from per-source AiSourceConfig) is uncached so
 *     overrides don't invalidate the cache
 *   - `max_tokens: 1024` with explicit `stop_reason === 'max_tokens'` throw —
 *     truncated tool input is invalid JSON; fail loudly
 *   - Defensive `isStateWide → bezirkSlugs=[]` guard at the schema boundary so
 *     a misbehaving model can't double-classify
 *   - Cache-aware token split surfaces `cache_read_input_tokens` and
 *     `cache_creation_input_tokens` for honest accounting in PipelineRun /
 *     per-article telemetry
 *
 * Requirements: AIPL-01, AIPL-02, AIPL-03, AIPL-04, AIPL-05
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'

import { getResolvedAiConfig, type ResolvedAiConfig } from '../../admin/ai-config-dal'

export type BezirkInput = { slug: string; name: string; gemeindeSynonyms: string[] }

export interface MergedResult {
  // Tagging fields
  bezirkSlugs: string[]
  isStateWide: boolean
  mentionsPrivateIndividual: boolean
  // Writing fields
  headline: string
  lead: string
  body: string
  seoTitle: string
  metaDescription: string
  // Token accounting (cache-aware)
  inputTokens: number
  cachedInputTokens: number
  cacheCreationTokens: number
  outputTokens: number
}

const MERGED_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    bezirkSlugs: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Slugs der relevanten Bezirke aus der bereitgestellten Liste. Leer, wenn isStateWide=true oder kein Bezug zur Steiermark.',
    },
    isStateWide: {
      type: 'boolean',
      description:
        'true, wenn der Artikel die gesamte Steiermark betrifft und nicht einem einzelnen Bezirk zugeordnet werden kann. Wenn true, MUSS bezirkSlugs leer sein.',
    },
    mentionsPrivateIndividual: {
      type: 'boolean',
      description:
        'true, wenn der Artikel eine reale, lebende, namentlich genannte Privatperson nennt. Organisationen, historische Figuren und fiktive Charaktere zählen nicht.',
    },
    headline: {
      type: 'string',
      description: 'Überschrift des umgeschriebenen Artikels.',
    },
    lead: {
      type: 'string',
      description: '1-2 Sätze, fasst die Kernaussage zusammen. Quelle für metaDescription.',
    },
    body: {
      type: 'string',
      description: 'Restlicher Artikeltext nach dem Lead.',
    },
    seoTitle: {
      type: 'string',
      description: 'SEO-optimierter Titel, maximal 60 Zeichen.',
    },
    metaDescription: {
      type: 'string',
      description: 'SEO-Meta-Beschreibung, maximal 160 Zeichen, basierend auf dem lead.',
    },
  },
  required: [
    'bezirkSlugs',
    'isStateWide',
    'mentionsPrivateIndividual',
    'headline',
    'lead',
    'body',
    'seoTitle',
    'metaDescription',
  ],
  additionalProperties: false,
} satisfies Anthropic.Messages.Tool.InputSchema

const TOOL_NAME = 'publish_article'

/**
 * Builds the Bezirk list block injected into the static (cacheable) system
 * prefix. Each line: `slug (Name): synonym1, synonym2, ...` (slug-only when
 * synonyms are empty).
 *
 * NOTE: Format replicates `step1-tag.ts:51-77`'s `buildBezirkContext` verbatim
 * but is intentionally isolated here so `step1-tag.ts` can be deleted in v3.3
 * without touching this file. Do not extract to a shared helper.
 */
export function buildBezirkList(bezirke: BezirkInput[]): string {
  return bezirke
    .map((b) =>
      b.gemeindeSynonyms.length > 0
        ? `${b.slug} (${b.name}): ${b.gemeindeSynonyms.join(', ')}`
        : `${b.slug} (${b.name})`,
    )
    .join('\n')
}

/**
 * Builds the static system prefix — role + rules + Bezirk list. This is the
 * block tagged with `cache_control: {type: 'ephemeral'}`. Keep it stable
 * across calls: the Bezirk list dominates token count and cache hit rate.
 */
export function buildStaticPrefix(bezirkList: string): string {
  return `Du bist ein österreichischer Lokaljournalist und gleichzeitig Klassifizierer für regionale Nachrichten in der Steiermark.

Du erledigst in einem einzigen Durchgang vier Aufgaben:
1. KLASSIFIZIERUNG: Weise den Artikel den relevanten Bezirken zu oder markiere ihn als Steiermark-weit.
2. PERSONEN-ERKENNUNG: Erkenne, ob der Artikel eine reale, lebende Privatperson namentlich nennt.
3. UMSCHREIBUNG: Schreibe den Artikel als kurze, sachliche Hochdeutsch-Nachricht um.
4. SEO: Erzeuge seoTitle und metaDescription.

Antworte ausschließlich über das bereitgestellte Tool "${TOOL_NAME}". Freitext, Kommentare oder Erklärungen außerhalb des Tools sind nicht erlaubt.

KLASSIFIZIERUNG
- bezirkSlugs: Wähle Slugs ausschließlich aus der Liste am Ende dieser Nachricht. Erfinde keine Slugs.
- isStateWide=true, wenn der Artikel die gesamte Steiermark betrifft und nicht einem einzelnen Bezirk zugeordnet werden kann. In diesem Fall MUSS bezirkSlugs ein leeres Array sein.
- isStateWide=false und bezirkSlugs leer, wenn der Artikel keinen Bezug zur Steiermark hat.
- mentionsPrivateIndividual=true nur dann, wenn eine reale, lebende, namentlich genannte Privatperson erwähnt wird. Organisationen, historische Figuren, fiktive Charaktere und Marken zählen nicht.

UMSCHREIBUNG
- Schreibe in Hochdeutsch, ohne Dialekt oder Umgangssprache.
- Struktur: headline (Überschrift) + lead (1-2 Sätze, fasst die Kernaussage zusammen) + body (restlicher Text).
- Übernimm KEINE Presseformular-Floskeln ("OTS0123", "Rückfragen & Kontakt", "Aussender", "Pressekontakt").
- Übernimm KEINE Telefonnummern, E-Mail-Adressen, Webadressen oder Kontaktdaten.
- Nenne keinen Aussender, keine Quelle, keinen Verteiler.

SEO
- seoTitle: maximal 60 Zeichen, prägnant, suchmaschinenfreundlich.
- metaDescription: maximal 160 Zeichen, basierend auf dem lead.

VERFÜGBARE BEZIRKE
${bezirkList}`
}

/**
 * Builds the dynamic suffix — tone + length + optional styleNotes from the
 * resolved AI config. Lives outside the cached block so per-source overrides
 * don't invalidate cache hits on the static prefix.
 */
export function buildDynamicSuffix(config: ResolvedAiConfig): string {
  const tone = {
    NEUTRAL: 'neutral, objektiv, kein Dialekt, keine Umgangssprache.',
    FORMAL: 'formell, seriös, kein Dialekt, keine Umgangssprache.',
    CONVERSATIONAL: 'zugänglich, verständlich, kein Dialekt, keine Umgangssprache.',
  }[config.tone]

  const length = {
    SHORT: 'Gesamtlänge: 100-150 Wörter.',
    MEDIUM: 'Gesamtlänge: 100-200 Wörter.',
    LONG: 'Gesamtlänge: 200-350 Wörter.',
  }[config.articleLength]

  const extra = config.styleNotes
    ? `\n\nZUSÄTZLICHE ANWEISUNGEN: ${config.styleNotes}`
    : ''

  return `TON: ${tone}\nLÄNGE: ${length}${extra}`
}

/**
 * Single Anthropic tool_use call producing the merged tagging + writing
 * result. Pipeline integration is intentionally NOT in this module — Plan
 * 43-03 wires this into the pipeline.
 *
 * @param client     Anthropic client (injected for testability via vi.spyOn)
 * @param articleText Raw article text — already extracted by Plan 43-03 in production
 * @param bezirke    Full Bezirke list (slug + name + synonyms) for classification
 * @param db         PrismaClient (used to resolve per-source AI config)
 * @param sourceId   Optional source ID for AiSourceConfig override lookup
 * @throws Error('Merged AI call truncated: ...') when stop_reason='max_tokens'
 * @throws Error('No tool_use block named "publish_article" in response') when response lacks tool_use
 */
export async function runMergedCall(
  client: Anthropic,
  articleText: string,
  bezirke: BezirkInput[],
  db: PrismaClient,
  sourceId?: number,
): Promise<MergedResult> {
  const resolvedConfig = await getResolvedAiConfig(db, sourceId ?? undefined)
  const bezirkList = buildBezirkList(bezirke)
  const staticPrefix = buildStaticPrefix(bezirkList)
  const dynamicSuffix = buildDynamicSuffix(resolvedConfig)

  const response = await client.messages.create({
    model: resolvedConfig.modelOverride ?? 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: staticPrefix,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: dynamicSuffix,
      },
    ],
    messages: [{ role: 'user', content: articleText }],
    tools: [
      {
        name: TOOL_NAME,
        description:
          'Klassifiziert den Artikel und liefert die finale, redaktionsfertige Version.',
        input_schema: MERGED_OUTPUT_SCHEMA,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      `Merged AI call truncated: stop_reason=max_tokens, output exceeded 1024 tokens — bump max_tokens or shorten article`,
    )
  }

  const toolUse = response.content.find(
    (b) => b.type === 'tool_use' && b.name === TOOL_NAME,
  )
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`No tool_use block named "${TOOL_NAME}" in response`)
  }

  const parsed = toolUse.input as {
    bezirkSlugs: string[]
    isStateWide: boolean
    mentionsPrivateIndividual: boolean
    headline: string
    lead: string
    body: string
    seoTitle: string
    metaDescription: string
  }

  // Defensive guard: if the model violates the "isStateWide → empty bezirkSlugs"
  // rule, prefer isStateWide. Pipeline-side warning lives in Plan 43-03's
  // integration, not here, to keep this module self-contained.
  const cleanBezirkSlugs = parsed.isStateWide ? [] : parsed.bezirkSlugs

  return {
    bezirkSlugs: cleanBezirkSlugs,
    isStateWide: parsed.isStateWide,
    mentionsPrivateIndividual: parsed.mentionsPrivateIndividual,
    headline: parsed.headline,
    lead: parsed.lead,
    body: parsed.body,
    seoTitle: parsed.seoTitle,
    metaDescription: parsed.metaDescription,
    inputTokens: response.usage.input_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    outputTokens: response.usage.output_tokens,
  }
}
