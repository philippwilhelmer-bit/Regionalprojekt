import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";
import { formatRelativeTime } from "./ArticleCard";

interface EditorialStackCardProps {
  article: ArticleWithBezirke;
  variant?: "hero" | "row";
}

export function EditorialStackCard({ article, variant = "hero" }: EditorialStackCardProps) {
  const articleSlug = slugify(article.title ?? "artikel");
  const href = `/artikel/${article.publicId}/${articleSlug}`;
  const firstBezirk = article.bezirke[0]?.bezirk;
  const publishedAt = new Date(article.publishedAt ?? article.createdAt);
  const category = firstBezirk?.name ?? "Steiermark";

  const excerpt = article.content
    ? article.content.slice(0, 110) + (article.content.length > 110 ? "…" : "")
    : null;

  if (variant === "row") {
    return (
      <Link href={href} className="group flex items-center gap-4 py-3">
        <div className="w-20 h-20 shrink-0 rounded-sm overflow-hidden bg-gradient-to-br from-ink to-ink-soft">
          {article.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={article.imageUrl}
              alt={article.title ?? ""}
              className="w-full h-full object-cover img-matte"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-label uppercase text-[11px] tracking-[0.15em] text-accent font-semibold mb-1">
            {category}
          </p>
          <h3 className="font-headline tracking-tight text-base font-semibold text-primary leading-snug group-hover:text-accent transition-colors">
            {article.title}
          </h3>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block">
      <div className="relative w-full aspect-video rounded-sm overflow-hidden bg-gradient-to-br from-ink to-ink-soft mb-3">
        {article.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={article.imageUrl}
            alt={article.title ?? ""}
            className="absolute inset-0 w-full h-full object-cover img-matte"
          />
        )}
      </div>
      <p className="font-label uppercase text-[11px] tracking-[0.15em] text-accent font-semibold mb-2">
        {category}
      </p>
      <h3 className="font-headline tracking-tight text-xl font-semibold text-primary leading-snug mb-2 group-hover:text-accent transition-colors">
        {article.title}
      </h3>
      {excerpt && (
        <p className="font-body text-sm text-ink-muted leading-relaxed mb-2">
          {excerpt}
        </p>
      )}
      <div className="flex items-center gap-1 text-xs text-ink-muted">
        <span className="material-symbols-rounded text-[14px]" aria-hidden="true">schedule</span>
        <time dateTime={publishedAt.toISOString()}>{formatRelativeTime(publishedAt)}</time>
      </div>
    </Link>
  );
}
