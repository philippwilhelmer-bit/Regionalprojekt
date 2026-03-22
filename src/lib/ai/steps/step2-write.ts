/**
 * Step 2: Write & SEO
 *
 * Calls claude-haiku-4-5-20251001 with structured JSON output mode and returns
 * a fully rewritten German-language article (headline, lead, body) plus SEO fields
 * (seoTitle, metaDescription).
 *
 * Requirements: AI-01 (German article rewrite), SEO-02 (SEO-optimised title + meta description)
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'
import { getAiConfig, type ResolvedAiConfig } from '../../admin/ai-config-dal'

// JSON schema for Step 2 structured output — all five fields required
const Step2Schema = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    lead: {
      type: 'string',
      description: '1-2 sentences; becomes meta description source',
    },
    body: {
      type: 'string',
      description: 'Remaining article content',
    },
    seoTitle: {
      type: 'string',
      description: 'SEO-optimized title ≤60 chars',
    },
    metaDescription: {
      type: 'string',
      description: 'SEO meta description ≤160 chars',
    },
  },
  required: ['headline', 'lead', 'body', 'seoTitle', 'metaDescription'],
  additionalProperties: false,
} as const

/**
 * Result returned by runStep2Write().
 * pipeline.ts uses: title = headline, content = `${lead}\n\n${body}`,
 * seoTitle and metaDescription written directly to Article row.
 */
export interface Step2Result {
  headline: string
  lead: string
  body: string
  seoTitle: string
  metaDescription: string
  inputTokens: number
  outputTokens: number
}

function buildBezirkContext(bezirkNames: string[]): string {
  return bezirkNames.length > 0
    ? `Betroffene Bezirke: ${bezirkNames.join(', ')}`
    : 'Steiermark-weit'
}

/**
 * Builds the system prompt from DB-driven AiConfig values.
 * Preserves the core Bezirk-context and Hochdeutsch rewrite instructions from the original template.
 * NOTE: LOW confidence until validated against real OTS data in Phase 7.
 */
export function buildSystemPrompt(config: ResolvedAiConfig, bezirkContext: string): string {
  const toneInstruction = {
    NEUTRAL: 'Ton: neutral, objektiv, kein Dialekt, keine Umgangssprache.',
    FORMAL: 'Ton: formell, seriös, kein Dialekt, keine Umgangssprache.',
    CONVERSATIONAL: 'Ton: zugänglich, verständlich, kein Dialekt, keine Umgangssprache.',
  }[config.tone]

  const lengthInstruction = {
    SHORT: 'Gesamtlänge: 100-150 Wörter.',
    MEDIUM: 'Gesamtlänge: 100-200 Wörter.',
    LONG: 'Gesamtlänge: 200-350 Wörter.',
  }[config.articleLength]

  const styleNotes = config.styleNotes
    ? `\nZusätzliche Anweisungen: ${config.styleNotes}`
    : ''

  return `Du bist ein österreichischer Lokaljournalist. Schreibe den folgenden Presseartikel als kurze, sachliche Nachricht auf Hochdeutsch um.
Struktur: Überschrift (headline) + Einstiegssatz (lead, 1-2 Sätze, fasst die Kernaussage zusammen) + Haupttext (body).
${lengthInstruction}
${toneInstruction}
Geografischer Kontext: ${bezirkContext}
seoTitle: SEO-optimierter Titel, maximal 60 Zeichen.
metaDescription: SEO-Meta-Beschreibung, maximal 160 Zeichen, basierend auf dem lead.
Schreibe kein Presseformular, keine Quellenangabe, keine Kontaktdaten aus der Originalmeldung.${styleNotes}
Antworte im vorgegebenen JSON-Format.`
}

/**
 * Step 2 AI call: rewrite article text in German and generate SEO fields.
 *
 * @param client - Anthropic SDK client instance (injected for testability)
 * @param articleText - Raw article content to rewrite
 * @param bezirkNames - Bezirk slugs/names from Step 1 tagging, used for geographic context
 * @param db - Optional PrismaClient for DI (uses singleton when not provided)
 * @returns Step2Result with rewritten content and SEO fields plus token counts
 * @throws Error('No text block in response') if the API response contains no text block
 */
export async function runStep2Write(
  client: Anthropic,
  articleText: string,
  bezirkNames: string[],
  db?: PrismaClient
): Promise<Step2Result> {
  // Read AI config from DB (global only — per-source override wired in Phase 7 when sourceId is available)
  // TODO(Phase 7): pass sourceId to getResolvedAiConfig for per-source prompt overrides
  const aiConfig = await getAiConfig(db)
  const resolvedConfig: ResolvedAiConfig = {
    tone: aiConfig.tone,
    articleLength: aiConfig.articleLength,
    styleNotes: aiConfig.styleNotes,
    modelOverride: aiConfig.modelOverride,
  }

  const bezirkContext = buildBezirkContext(bezirkNames)
  const systemPrompt = buildSystemPrompt(resolvedConfig, bezirkContext)

  const response = await (client.messages.create as Function)({
    model: resolvedConfig.modelOverride ?? 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: articleText }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: Step2Schema,
      },
    },
  })

  const textBlock = response.content.find(
    (b: { type: string }) => b.type === 'text'
  ) as { type: 'text'; text: string } | undefined

  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in response')
  }

  const parsed = JSON.parse(textBlock.text) as {
    headline: string
    lead: string
    body: string
    seoTitle: string
    metaDescription: string
  }

  return {
    headline: parsed.headline,
    lead: parsed.lead,
    body: parsed.body,
    seoTitle: parsed.seoTitle,
    metaDescription: parsed.metaDescription,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
