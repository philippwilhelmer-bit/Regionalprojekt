import type { Article } from '@prisma/client'

export type ArticleWithBezirke = Article & {
  bezirke: {
    bezirk: {
      id: number
      slug: string
      name: string
      gemeindeSynonyms: string[]
      createdAt: Date
    }
    articleId: number
    bezirkId: number
    taggedAt: Date
  }[]
}

export function groupArticlesByBezirk(
  articles: ArticleWithBezirke[]
): Map<string, { name: string; articles: ArticleWithBezirke[] }> {
  const result = new Map<string, { name: string; articles: ArticleWithBezirke[] }>()

  const withBezirk = articles.filter(
    (a) => !a.isStateWide && a.bezirke.length > 0
  )
  const stateWide = articles.filter((a) => a.isStateWide)

  for (const article of withBezirk) {
    const firstEntry = article.bezirke[0]
    const { slug, name } = firstEntry.bezirk

    if (!result.has(slug)) {
      result.set(slug, { name, articles: [] })
    }
    result.get(slug)!.articles.push(article)
  }

  for (const [, group] of result) {
    group.articles.push(...stateWide)
  }

  return result
}
