import { listArticlesForSearch, getPinnedArticles } from "@/lib/content/articles";
import { listBezirke } from "@/lib/content/bezirke";
import { SearchPageLayout } from "@/components/reader/SearchPageLayout";

export const dynamic = "force-dynamic";

export const metadata = { title: "Suche" };

export default async function SuchePage() {
  const [articles, bezirke, recommended] = await Promise.all([
    listArticlesForSearch(),
    listBezirke(),
    getPinnedArticles({ limit: 6 }),
  ]);
  return <SearchPageLayout articles={articles} bezirke={bezirke} recommended={recommended} />;
}
