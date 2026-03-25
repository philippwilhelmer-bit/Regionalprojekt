import type { ArticleWithBezirke } from "@/lib/content/articles";
import { ArticleCard } from "./ArticleCard";

interface BezirkSectionProps {
  bezirkName: string;
  articles: ArticleWithBezirke[];
  showDivider?: boolean;
}

export function BezirkSection({ bezirkName, articles, showDivider = false }: BezirkSectionProps) {
  if (articles.length === 0) return null;

  const [featuredArticle, ...rest] = articles;
  // Take up to 2 sidebar articles for the third column
  const sidebarArticles = rest.slice(0, 2);

  return (
    <section className="px-4 py-4">
      {/* Wood-textured divider */}
      {showDivider && (
        <hr
          className="border-0 h-px my-6"
          style={{
            background: "linear-gradient(to right, transparent, #8B7355 20%, #8B7355 80%, transparent)",
          }}
        />
      )}

      {/* Styrian flag accent: white top half, styrian-green bottom half */}
      <div
        className="mb-2 rounded-sm"
        style={{
          width: 32,
          height: 4,
          background: "linear-gradient(to bottom, #fff 50%, #2D5A27 50%)",
        }}
      />

      {/* Section heading */}
      <h2 className="font-label font-semibold text-styrian-green uppercase tracking-wide text-xs mb-3">
        {bezirkName}
      </h2>

      {/* Editorial grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Featured article — takes 2/3 on desktop */}
        <div className="md:col-span-2">
          <ArticleCard article={featuredArticle} featured />
        </div>

        {/* Sidebar: stacked cards in third column (only if there are sidebar articles) */}
        {sidebarArticles.length > 0 && (
          <div className="flex flex-col gap-3">
            {sidebarArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
