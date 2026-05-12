import type { ArticleWithBezirke } from "@/lib/content/articles";
import { RegionalEditorialCard } from "./RegionalEditorialCard";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface GrueneWocheSectionProps {
  articles: ArticleWithBezirke[];
}

export function GrueneWocheSection({ articles }: GrueneWocheSectionProps) {
  if (articles.length === 0) return null;
  const featured = articles.slice(0, 3);

  return (
    <div>
      <Eyebrow className="mb-4">Das Archiv der Woche</Eyebrow>
      <div className="space-y-8">
        {featured.map((article) => (
          <RegionalEditorialCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
