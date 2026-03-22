import type { Metadata } from 'next'
import type { ArticleWithBezirke } from '../content/articles'
import { slugify } from './slug'

/**
 * Builds a Next.js Metadata object for an article detail page.
 *
 * Returns an empty object when article is null (allows generateMetadata to
 * handle not-found gracefully without throwing).
 */
export function buildArticleMetadata(
  article: ArticleWithBezirke | null,
  baseUrl: string
): Metadata {
  if (!article) return {}

  const slug = slugify(article.seoTitle ?? article.title ?? '')
  const canonical = `${baseUrl}/artikel/${article.publicId}/${slug}`

  return {
    title: article.seoTitle ?? article.title ?? 'Artikel',
    description: article.metaDescription ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: article.seoTitle ?? article.title ?? 'Artikel',
      description: article.metaDescription ?? undefined,
      url: canonical,
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
    },
  }
}
