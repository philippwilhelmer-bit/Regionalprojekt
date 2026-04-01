import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";
import { formatRelativeTime } from "./ArticleCard";

interface ListItemProps {
  article: ArticleWithBezirke;
}

export function ListItem({ article }: ListItemProps) {
  const articleSlug = slugify(article.title ?? "artikel");
  const href = `/artikel/${article.publicId}/${articleSlug}`;
  const firstBezirk = article.bezirke[0]?.bezirk;
  const publishedAt = new Date(article.publishedAt ?? article.createdAt);

  return (
    <Link
      href={href}
      className="flex items-start gap-3 py-3 bg-parchment hover:bg-parchment-dim transition-colors"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-headline text-sm font-semibold text-ink leading-snug line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {firstBezirk && (
            <span className="text-xs font-medium text-ink-muted">
              {firstBezirk.name}
            </span>
          )}
          <time dateTime={publishedAt.toISOString()} className="text-xs text-ink-dim">
            {formatRelativeTime(publishedAt)}
          </time>
        </div>
      </div>
      {/* Small chevron indicator */}
      <svg
        className="w-4 h-4 text-slate-muted mt-1 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
