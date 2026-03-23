// Always render the homepage dynamically — article feed must be fresh.
// Prevents Next.js from attempting to statically pre-render at build time.
export const dynamic = 'force-dynamic'

import { listArticlesReader } from "@/lib/content/articles";
import { ArticleFeed } from "@/components/reader/ArticleFeed";
import { BezirkModal } from "@/components/reader/BezirkModal";
import { AdUnit } from "@/components/reader/AdUnit";

export default async function HomePage() {
  const articles = await listArticlesReader({ limit: 20 });

  return (
    <div className="max-w-2xl mx-auto">
      <BezirkModal />
      <div className="px-4 pb-4">
        <AdUnit zone="hero" />
      </div>
      <ArticleFeed initialArticles={articles} />
    </div>
  );
}
