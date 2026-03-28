"use client";

import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";

const BEZIRK_COLORS: Record<string, string> = {
  graz: "from-primary to-[#3a6b33]",
  "graz-umgebung": "from-[#3a6b33] to-primary",
  liezen: "from-secondary to-[#5a7d54]",
  "bruck-muerzzuschlag": "from-[#5a7d54] to-secondary",
  leoben: "from-primary to-secondary",
  murau: "from-[#244d20] to-primary",
  murtal: "from-secondary to-primary",
  voitsberg: "from-[#4a6e44] to-[#3a6b33]",
  deutschlandsberg: "from-primary to-[#4a6e44]",
  weiz: "from-[#3a6b33] to-[#5a7d54]",
  "hartberg-fuerstenfeld": "from-[#5a7d54] to-[#3a6b33]",
  suedoststeiermark: "from-[#244d20] to-[#3a6b33]",
  leibnitz: "from-secondary to-[#244d20]",
};

const BEZIRK_BADGE_COLORS: Record<string, string> = {
  graz: "text-primary bg-background",
  "graz-umgebung": "text-primary bg-background",
  liezen: "text-secondary bg-background",
  "bruck-muerzzuschlag": "text-secondary bg-background",
  leoben: "text-primary bg-background",
  murau: "text-[#244d20] bg-background",
  murtal: "text-secondary bg-background",
  voitsberg: "text-primary bg-background",
  deutschlandsberg: "text-primary bg-background",
  weiz: "text-[#3a6b33] bg-background",
  "hartberg-fuerstenfeld": "text-secondary bg-background",
  suedoststeiermark: "text-[#244d20] bg-background",
  leibnitz: "text-secondary bg-background",
};

interface TopMeldungenRowProps {
  articles: ArticleWithBezirke[];
  heading?: string;
}

export function TopMeldungenRow({ articles, heading = "Top-Meldungen" }: TopMeldungenRowProps) {
  return (
    <section className="py-3">
      {/* Section label */}
      <div className="px-[var(--spacing-gutter)]">
        <span className="font-label font-semibold uppercase tracking-wide text-xs text-primary">
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
            const gradientColor = firstBezirk
              ? (BEZIRK_COLORS[firstBezirk.slug] ?? "from-secondary to-[#5a7d54]")
              : "from-secondary to-[#5a7d54]";
            const badgeColor = firstBezirk
              ? (BEZIRK_BADGE_COLORS[firstBezirk.slug] ?? "text-secondary bg-background")
              : "text-secondary bg-background";
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
                    className={`bg-gradient-to-br ${gradientColor} aspect-square max-h-28 rounded-sm mb-2`}
                  />
                )}

                {/* Headline */}
                <h3 className="font-headline text-sm font-semibold text-zinc-900 leading-snug line-clamp-2 mb-1">
                  {article.title}
                </h3>

                {/* Bezirk badge */}
                {firstBezirk && (
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-sm font-medium ${badgeColor}`}
                  >
                    {firstBezirk.name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right-edge fade hint */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />
      </div>
    </section>
  );
}
