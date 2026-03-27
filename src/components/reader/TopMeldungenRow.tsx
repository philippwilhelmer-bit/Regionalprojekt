"use client";

import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";

const BEZIRK_COLORS: Record<string, string> = {
  graz: "from-styrian-green to-[#3a6b33]",
  "graz-umgebung": "from-[#3a6b33] to-styrian-green",
  liezen: "from-sage to-[#5a7d54]",
  "bruck-muerzzuschlag": "from-[#5a7d54] to-sage",
  leoben: "from-styrian-green to-sage",
  murau: "from-[#244d20] to-styrian-green",
  murtal: "from-sage to-styrian-green",
  voitsberg: "from-[#4a6e44] to-[#3a6b33]",
  deutschlandsberg: "from-styrian-green to-[#4a6e44]",
  weiz: "from-[#3a6b33] to-[#5a7d54]",
  "hartberg-fuerstenfeld": "from-[#5a7d54] to-[#3a6b33]",
  suedoststeiermark: "from-[#244d20] to-[#3a6b33]",
  leibnitz: "from-sage to-[#244d20]",
};

const BEZIRK_BADGE_COLORS: Record<string, string> = {
  graz: "text-styrian-green bg-cream",
  "graz-umgebung": "text-styrian-green bg-cream",
  liezen: "text-sage bg-cream",
  "bruck-muerzzuschlag": "text-sage bg-cream",
  leoben: "text-styrian-green bg-cream",
  murau: "text-[#244d20] bg-cream",
  murtal: "text-sage bg-cream",
  voitsberg: "text-styrian-green bg-cream",
  deutschlandsberg: "text-styrian-green bg-cream",
  weiz: "text-[#3a6b33] bg-cream",
  "hartberg-fuerstenfeld": "text-sage bg-cream",
  suedoststeiermark: "text-[#244d20] bg-cream",
  leibnitz: "text-sage bg-cream",
};

interface TopMeldungenRowProps {
  articles: ArticleWithBezirke[];
  heading?: string;
}

export function TopMeldungenRow({ articles, heading = "Top-Meldungen" }: TopMeldungenRowProps) {
  return (
    <section className="py-3">
      {/* Section label with thin divider */}
      <div className="px-4">
        <div className="border-t border-sage/20 mb-2" />
        <span className="font-label font-semibold uppercase tracking-wide text-xs text-styrian-green">
          {heading}
        </span>
      </div>

      {/* Horizontal scroll container with right-edge fade */}
      <div className="relative mt-2">
        <div
          className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {articles.map((article) => {
            const firstBezirk = article.bezirke[0]?.bezirk;
            const gradientColor = firstBezirk
              ? (BEZIRK_COLORS[firstBezirk.slug] ?? "from-sage to-[#5a7d54]")
              : "from-sage to-[#5a7d54]";
            const badgeColor = firstBezirk
              ? (BEZIRK_BADGE_COLORS[firstBezirk.slug] ?? "text-sage bg-cream")
              : "text-sage bg-cream";
            const href = `/artikel/${article.publicId}/${slugify(article.title ?? "artikel")}`;

            return (
              <Link
                key={article.id}
                href={href}
                className="flex-shrink-0 w-44 block border-b border-cream-dark pb-2"
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
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-cream to-transparent z-10" />
      </div>
    </section>
  );
}
