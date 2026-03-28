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
    ? (BEZIRK_COLORS[firstBezirk.slug] ?? "from-secondary to-[#5a7d54]")
    : "from-secondary to-[#5a7d54]";

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
        "block bg-surface-elevated rounded-sm shadow-sm overflow-hidden hover:bg-surface transition-colors" +
        (featured ? " col-span-full" : "")
      }
    >
      {/* Image or gradient header */}
      <div
        className={
          "relative " +
          (article.imageUrl ? "" : "bg-gradient-to-br " + gradientColor) +
          (featured ? " aspect-video" : " aspect-square max-h-32")
        }
      >
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt={article.title ?? ""}
            className="absolute inset-0 w-full h-full object-cover img-matte"
          />
        )}
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
                    "text-secondary bg-background")
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
