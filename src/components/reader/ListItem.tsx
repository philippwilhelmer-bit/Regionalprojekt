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
      className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-headline text-sm font-semibold text-zinc-900 leading-snug line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {firstBezirk && (
            <span className="text-xs font-medium text-styrian-green">
              {firstBezirk.name}
            </span>
          )}
          <time dateTime={publishedAt.toISOString()} className="text-xs text-zinc-400">
            {formatRelativeTime(publishedAt)}
          </time>
        </div>
      </div>
      {/* Small chevron indicator */}
      <svg
        className="w-4 h-4 text-zinc-300 mt-1 flex-shrink-0"
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
