// Always render the homepage dynamically — article feed must be fresh.
// Prevents Next.js from attempting to statically pre-render at build time.
export const dynamic = 'force-dynamic'

import { getFeaturedArticle, getPinnedArticles, listArticlesForHomepage } from "@/lib/content/articles";
import { HomepageLayout } from "@/components/reader/HomepageLayout";

export default async function HomePage() {
  const [hero, pinned, allArticles] = await Promise.all([
    getFeaturedArticle(),
    getPinnedArticles(),
    listArticlesForHomepage(),
  ]);

  return <HomepageLayout hero={hero} pinnedArticles={pinned} allArticles={allArticles} />;
}
