// Always render the homepage dynamically — article feed must be fresh.
// Prevents Next.js from attempting to statically pre-render at build time.
export const dynamic = 'force-dynamic'

import { getFeaturedArticle, listArticlesForHomepage, listGrueneWocheArticles } from "@/lib/content/articles";
import { HomepageLayout } from "@/components/reader/HomepageLayout";

export default async function HomePage() {
  const [hero, allArticles, grueneWocheArticles] = await Promise.all([
    getFeaturedArticle(),
    listArticlesForHomepage(),
    listGrueneWocheArticles({ limit: 10 }),
  ]);

  return <HomepageLayout hero={hero} allArticles={allArticles} grueneWocheArticles={grueneWocheArticles} />;
}
