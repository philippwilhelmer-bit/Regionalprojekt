import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";

const BEZIRK_COLORS: Record<string, string> = {
  graz: "from-blue-600 to-blue-400",
  "graz-umgebung": "from-sky-500 to-sky-300",
  liezen: "from-emerald-600 to-emerald-400",
  "bruck-muerzzuschlag": "from-teal-600 to-teal-400",
  leoben: "from-cyan-700 to-cyan-500",
  murau: "from-violet-600 to-violet-400",
  murtal: "from-purple-600 to-purple-400",
  voitsberg: "from-indigo-500 to-indigo-300",
  deutschlandsberg: "from-amber-600 to-amber-400",
  weiz: "from-orange-600 to-orange-400",
  "hartberg-fuerstenfeld": "from-rose-600 to-rose-400",
  suedoststeiermark: "from-red-600 to-red-400",
  leibnitz: "from-lime-700 to-lime-500",
};

const BEZIRK_BADGE_COLORS: Record<string, string> = {
  graz: "text-blue-700 bg-blue-100",
  "graz-umgebung": "text-sky-700 bg-sky-100",
  liezen: "text-emerald-700 bg-emerald-100",
  "bruck-muerzzuschlag": "text-teal-700 bg-teal-100",
  leoben: "text-cyan-800 bg-cyan-100",
  murau: "text-violet-700 bg-violet-100",
  murtal: "text-purple-700 bg-purple-100",
  voitsberg: "text-indigo-700 bg-indigo-100",
  deutschlandsberg: "text-amber-700 bg-amber-100",
  weiz: "text-orange-700 bg-orange-100",
  "hartberg-fuerstenfeld": "text-rose-700 bg-rose-100",
  suedoststeiermark: "text-red-700 bg-red-100",
  leibnitz: "text-lime-800 bg-lime-100",
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
    ? (BEZIRK_COLORS[firstBezirk.slug] ?? "from-zinc-400 to-zinc-300")
    : "from-zinc-400 to-zinc-300";

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
        "block bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow" +
        (featured ? " col-span-full" : "")
      }
    >
      {/* Gradient header */}
      <div
        className={
          "relative bg-gradient-to-br " +
          gradientColor +
          (featured ? " h-40" : " h-24")
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
            "font-semibold text-zinc-900 leading-snug mb-1" +
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
                  "inline-block text-xs px-2 py-0.5 rounded-full font-medium " +
                  (BEZIRK_BADGE_COLORS[bezirk.slug] ??
                    "text-zinc-600 bg-zinc-100")
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
