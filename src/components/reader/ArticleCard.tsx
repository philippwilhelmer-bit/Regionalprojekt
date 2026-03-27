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

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes < 60) return `vor ${diffMinutes} Minute${diffMinutes === 1 ? "" : "n"}`;
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours === 1 ? "" : "n"}`;
  if (diffDays === 1) return "gestern";
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString("de-AT", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

interface ArticleCardProps {
  article: ArticleWithBezirke;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const firstBezirk = article.bezirke[0]?.bezirk;
  const gradientColor = firstBezirk
    ? (BEZIRK_COLORS[firstBezirk.slug] ?? "from-sage to-[#5a7d54]")
    : "from-sage to-[#5a7d54]";

  const articleSlug = slugify(article.title ?? "artikel");
  const href = `/artikel/${article.publicId}/${articleSlug}`;

  const excerpt = article.content
    ? article.content.slice(0, 160) + (article.content.length > 160 ? "…" : "")
    : null;

  const publishedAt = new Date(article.publishedAt ?? article.createdAt);

  return (
    <Link
      href={href}
      className={
        "block bg-white rounded-sm border border-cream-dark overflow-hidden hover:bg-cream-dark/50 transition-colors" +
        (featured ? " col-span-full" : "")
      }
    >
      {/* Gradient header */}
      <div
        className={
          "relative bg-gradient-to-br " +
          gradientColor +
          (featured ? " aspect-video" : " aspect-square max-h-32")
        }
      >
        {article.isPinned && (
          <span
            className="absolute top-2 right-2 text-white"
            aria-label="Pinned"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M16 1l-1.414 1.414L16 3.828V9l-2 1.5V15h-2V9.5L10 8V3.828l1.414-1.414L10 1H8v9l3 2.25V21h2v-8.75L16 10V1h0z" />
              <path
                fillRule="evenodd"
                d="M16 1v9l-3 2.25V21h-2v-8.75L8 10V1h8z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        <h2
          className={
            "font-headline font-semibold text-zinc-900 leading-snug mb-1" +
            (featured ? " text-lg" : " text-sm")
          }
        >
          {article.title}
        </h2>

        {excerpt && (
          <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{excerpt}</p>
        )}

        {/* Bezirk badges */}
        {article.bezirke.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {article.bezirke.map(({ bezirk }) => (
              <Link
                key={bezirk.id}
                href={`/bezirk/${bezirk.slug}`}
                onClick={(e) => e.stopPropagation()}
                className={
                  "inline-block text-xs px-2 py-0.5 rounded-sm font-medium " +
                  (BEZIRK_BADGE_COLORS[bezirk.slug] ??
                    "text-sage bg-cream")
                }
              >
                {bezirk.name}
              </Link>
            ))}
          </div>
        )}

        {/* Footer row: timestamp + AI label */}
        <div className="flex items-center justify-between">
          <time
            dateTime={publishedAt.toISOString()}
            className="text-xs text-zinc-400"
          >
            {formatRelativeTime(publishedAt)}
          </time>
          {article.isAutoGenerated && (
            <span className="text-xs text-zinc-400">Automatisch erstellt</span>
          )}
        </div>
      </div>
    </Link>
  );
}
