"use client";

import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";

interface TopMeldungenRowProps {
  articles: ArticleWithBezirke[];
  heading?: string;
}

export function TopMeldungenRow({ articles, heading = "Top-Meldungen" }: TopMeldungenRowProps) {
  return (
    <section className="py-3">
      {/* Section label */}
      <div className="px-[var(--spacing-gutter)]">
        <span className="font-label font-semibold uppercase tracking-wide text-xs text-ink-muted">
          {heading}
        </span>
      </div>

      {/* Horizontal scroll container with right-edge fade */}
      <div className="relative mt-2">
        <div
          className="flex gap-3 overflow-x-auto px-[var(--spacing-gutter)] pb-3 scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {articles.map((article) => {
            const firstBezirk = article.bezirke[0]?.bezirk;
            const href = `/artikel/${article.publicId}/${slugify(article.title ?? "artikel")}`;

            return (
              <Link
                key={article.id}
                href={href}
                className="flex-shrink-0 w-44 block pb-2"
              >
                {/* Thumbnail: image or gradient fallback */}
                {article.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.imageUrl}
                    alt={article.title ?? ''}
                    className="aspect-square max-h-28 w-full object-cover rounded-sm mb-2 img-matte"
                  />
                ) : (
                  <div
                    className="bg-gradient-to-br from-ink to-ink-soft aspect-square max-h-28 rounded-sm mb-2"
                  />
                )}

                {/* Headline */}
                <h3 className="font-headline text-sm font-semibold text-ink leading-snug line-clamp-2 mb-1">
                  {article.title}
                </h3>

                {/* Bezirk badge */}
                {firstBezirk && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-xs font-medium text-parchment bg-ink-soft">
                    {firstBezirk.name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right-edge fade hint */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-parchment to-transparent z-10" />
      </div>
    </section>
  );
}
