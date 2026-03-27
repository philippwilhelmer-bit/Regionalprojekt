import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";
import { formatRelativeTime } from "./ArticleCard";

interface EditorialCardProps {
  article: ArticleWithBezirke;
  category?: string;
}

export function EditorialCard({ article, category }: EditorialCardProps) {
  const articleSlug = slugify(article.title ?? "artikel");
  const href = `/artikel/${article.publicId}/${articleSlug}`;
  const firstBezirk = article.bezirke[0]?.bezirk;
  const publishedAt = new Date(article.publishedAt ?? article.createdAt);

  const categoryLabel = category ?? firstBezirk?.name ?? "Nachrichten";

  const summary = article.content
    ? article.content.slice(0, 180) + (article.content.length > 180 ? "\u2026" : "")
    : null;

  return (
    <article className="bg-white rounded-sm border border-zinc-100 overflow-hidden shadow-sm">
      {/* Image or gradient header */}
      {article.imageUrl ? (
        <Link href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={article.title ?? ""}
            loading="lazy"
            className="w-full h-48 object-cover"
          />
        </Link>
      ) : (
        <Link href={href}>
          <div className="w-full h-32 bg-gradient-to-br from-styrian-green to-sage" />
        </Link>
      )}

      {/* Card body */}
      <div className="p-4">
        {/* Category label — uppercase Work Sans */}
        <span className="font-label font-semibold uppercase tracking-wider text-xs text-styrian-green">
          {categoryLabel}
        </span>

        {/* Headline — Newsreader serif */}
        <Link href={href}>
          <h2 className="font-headline text-xl font-semibold text-zinc-900 leading-snug mt-2 mb-2">
            {article.title}
          </h2>
        </Link>

        {/* Summary text */}
        {summary && (
          <p className="text-sm text-zinc-600 leading-relaxed mb-3 line-clamp-3">
            {summary}
          </p>
        )}

        {/* Footer: timestamp + Read More link */}
        <div className="flex items-center justify-between">
          <time dateTime={publishedAt.toISOString()} className="text-xs text-zinc-400">
            {formatRelativeTime(publishedAt)}
          </time>

          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-styrian-green hover:text-[#244d20] transition-colors"
          >
            Weiterlesen
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
