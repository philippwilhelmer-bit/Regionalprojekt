import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";
import { formatRelativeTime } from "@/components/reader/ArticleCard";

interface RegionalEditorialCardProps {
  article: ArticleWithBezirke;
}

export function RegionalEditorialCard({ article }: RegionalEditorialCardProps) {
  const articleSlug = slugify(article.title ?? "artikel");
  const href = `/artikel/${article.publicId}/${articleSlug}`;
  const firstBezirk = article.bezirke[0]?.bezirk;
  const publishedAt = new Date(article.publishedAt ?? article.createdAt);

  return (
    <Link href={href} className="block">
      {/* Full-width aspect-video image */}
      <div className="relative w-full aspect-video rounded-sm overflow-hidden bg-gradient-to-br from-primary to-secondary">
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt={article.title ?? ""}
            className="absolute inset-0 w-full h-full object-cover img-matte"
          />
        )}
      </div>

      {/* Text body */}
      <div className="p-3">
        {/* Category / bezirk label */}
        {firstBezirk && (
          <p className="font-label uppercase text-xs tracking-wider text-primary font-semibold mb-1">
            {firstBezirk.name}
          </p>
        )}

        {/* Newsreader headline */}
        <h2 className="font-headline text-lg font-semibold text-zinc-900 leading-snug mb-1">
          {article.title}
        </h2>

        {/* Relative timestamp */}
        <time
          dateTime={publishedAt.toISOString()}
          className="text-xs text-zinc-400"
        >
          {formatRelativeTime(publishedAt)}
        </time>
      </div>
    </Link>
  );
}
