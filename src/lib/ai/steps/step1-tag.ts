/**
 * Step 1: Tag & Classify
 *
 * Calls claude-haiku-4-5-20251001 with structured JSON output mode to:
 *   - Identify which Steiermark Bezirke the article is relevant to (AI-02)
 *   - Detect whether the article mentions a real named individual (AI-03)
 *
 * Returns bezirkSlugs, hasNamedPerson, and token counts for cost tracking.
 *
 * System prompt is module-level (iteratable without code changes — per RESEARCH.md pitfall 5).
 * Prompt wording is LOW confidence until validated against real OTS data in Phase 7.
 *
 * Requirements: AI-02, AI-03
 */
import type Anthropic from '@anthropic-ai/sdk'

export interface Step1Result {
  bezirkSlugs: string[]
  hasNamedPerson: boolean
  inputTokens: number
  outputTokens: number
}

type BezirkInput = {
  slug: string
  name: string
  gemeindeSynonyms: string[]
}

const STEP1_SCHEMA = {
  type: 'object',
  properties: {
    bezirkSlugs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Slugs of matching Bezirke from the provided list',
    },
    hasNamedPerson: {
      type: 'boolean',
      description: 'True if the article mentions a real, living, named individual person',
    },
  },
  required: ['bezirkSlugs', 'hasNamedPerson'],
  additionalProperties: false,
} as const

/**
 * Builds the Bezirk context string injected into the Step 1 system prompt.
 * Each line: "slug (name): synonym1, synonym2, ..."
 */
function buildBezirkContext(bezirke: BezirkInput[]): string {
  return bezirke
    .map((b) =>
      b.gemeindeSynonyms.length > 0
        ? `${b.slug} (${b.name}): ${b.gemeindeSynonyms.join(', ')}`
        : `${b.slug} (${b.name})`
    )
    .join('\n')
}

/**
 * Builds the Step 1 system prompt with injected Bezirk context.
 * LOW confidence on exact wording — treat as draft until validated with real OTS data.
 */
function buildSystemPrompt(bezirkContext: string): string {
  return `You are a regional news classifier for Steiermark, Austria.
Classify the provided news article into the relevant Bezirke using ONLY the slugs listed below.
Return 'steiermark-weit' if the article is state-wide and not specific to any Bezirk.
When returning 'steiermark-weit', do not include any other Bezirk slugs — it is exclusive.
Return an empty array only if the article has no geographic relevance to Steiermark.

Available Bezirke:
${bezirkContext}

hasNamedPerson: Set to true ONLY if the article mentions a real, living, named individual person (not organisations, historical figures, or fictional characters).

Respond in the required JSON format.`
}

/**
 * Runs Step 1 of the AI pipeline: Tag & Classify.
 *
 * @param client  Anthropic client instance (injected for testability via vi.spyOn)
 * @param articleText  Raw article text to classify
 * @param bezirke  Full list of Bezirke with slugs and gemeindeSynonyms
 * @returns Step1Result with bezirkSlugs, hasNamedPerson, and token counts
 * @throws Error('No text block in response') if response contains no text block
 */
export async function runStep1Tag(
  client: Anthropic,
  articleText: string,
  bezirke: BezirkInput[]
): Promise<Step1Result> {
  const bezirkContext = buildBezirkContext(bezirke)
  const systemPrompt = buildSystemPrompt(bezirkContext)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: articleText }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output_config: {
      format: {
        type: 'json_schema',
        schema: STEP1_SCHEMA,
      },
    },
  } as any)

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in response')
  }

  const parsed = JSON.parse(textBlock.text) as {
    bezirkSlugs: string[]
    hasNamedPerson: boolean
  }

  return {
    bezirkSlugs: parsed.bezirkSlugs,
    hasNamedPerson: parsed.hasNamedPerson,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
