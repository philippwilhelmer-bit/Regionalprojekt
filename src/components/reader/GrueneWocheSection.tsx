import type { ArticleWithBezirke } from "@/lib/content/articles";
import { RegionalEditorialCard } from "./RegionalEditorialCard";
import { ListItem } from "./ListItem";

interface GrueneWocheSectionProps {
  articles: ArticleWithBezirke[];
}

export function GrueneWocheSection({ articles }: GrueneWocheSectionProps) {
  if (articles.length === 0) return null;
  const [featured, ...rest] = articles;
  const listArticles = rest.slice(0, 3);

  return (
    <section className="px-[var(--spacing-gutter)] py-[var(--spacing-section)]">
      <h2 className="font-headline text-xl font-semibold text-ink mb-3">
        Das Gruene der Woche
      </h2>
      <div className="mb-3">
        <RegionalEditorialCard article={featured} />
      </div>
      {listArticles.length > 0 && (
        <div className="bg-surface-elevated rounded-sm shadow-sm px-3">
          {listArticles.map((article) => (
            <ListItem key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}
