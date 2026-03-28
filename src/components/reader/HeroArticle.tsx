import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";

interface HeroArticleProps {
  article: ArticleWithBezirke;
}

export function HeroArticle({ article }: HeroArticleProps) {
  const articleSlug = slugify(article.title ?? "artikel");
  const href = `/artikel/${article.publicId}/${articleSlug}`;
  const firstBezirk = article.bezirke[0]?.bezirk;

  const excerpt = article.content
    ? article.content.slice(0, 200) + (article.content.length > 200 ? "…" : "")
    : null;

  return (
    <Link href={href} className="relative block overflow-hidden min-h-[60vh]">
      {/* Background: image or gradient fallback */}
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt={article.title ?? ""}
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover img-matte"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" />
      )}

      {/* Gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content: positioned at bottom */}
      <div className="relative z-10 flex flex-col justify-end min-h-[60vh] p-4 pb-6">
        {/* Topmeldung label */}
        <span className="inline-block self-start mb-2 px-2 py-0.5 rounded-sm font-label font-semibold uppercase text-xs tracking-wider text-background bg-primary">
          Topmeldung
        </span>

        {/* Bezirk badge */}
        {firstBezirk && (
          <span className="inline-block self-start mb-1 px-2 py-0.5 rounded-sm font-label font-semibold uppercase text-xs text-primary bg-background">
            {firstBezirk.name}
          </span>
        )}

        {/* Headline */}
        <h1 className="font-headline text-white text-2xl md:text-3xl font-semibold leading-tight mb-2">
          {article.title}
        </h1>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-white/80 text-sm line-clamp-2">{excerpt}</p>
        )}
      </div>
    </Link>
  );
}
