import { describe, it } from 'vitest'

// Implementation: src/lib/ai/pipeline.ts
// Requirements: AI-01, AI-02, AI-03, SEO-02

describe('processArticles()', () => {
  it.todo('advances a FETCHED article to TAGGED after Step 1')
  it.todo('advances a TAGGED article to WRITTEN after Step 2 (AI-01, SEO-02)')
  it.todo('writes seoTitle and metaDescription to Article row (SEO-02)')
  it.todo('creates ArticleBezirk rows for returned bezirkSlugs (AI-02)')
  it.todo('sets status REVIEW (not WRITTEN) when hasNamedPerson is true (AI-03)')
  it.todo('records PipelineRun with token totals')
  it.todo('returns ProcessResult with articlesProcessed and articlesWritten counts')
})
