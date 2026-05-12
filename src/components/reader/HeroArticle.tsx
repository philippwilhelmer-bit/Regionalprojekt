import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";

interface HeroArticleProps {
  article: ArticleWithBezirke;
}

export function HeroArticle({ article }: HeroArticleProps) {
  const articleSlug = slugify(article.title ?? "artikel");
  const href = `/artikel/${article.publicId}/${articleSlug}`;
  const firstBezirk = article.bezirke[0]?.bezirk;

  const excerpt = article.content
    ? article.content.slice(0, 180) + (article.content.length > 180 ? "…" : "")
    : null;

  const eyebrowLabel = firstBezirk ? firstBezirk.name : "Steiermark aktuell";

  return (
    <Link href={href} className="relative block overflow-hidden min-h-[60vh]">
      {/* Background photo or gradient fallback */}
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt={article.title ?? ""}
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover img-matte"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink to-ink-deep" />
      )}

      {/* Legibility gradient — bottom-up */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />

      <div className="relative z-10 flex flex-col justify-end min-h-[60vh] px-[var(--spacing-gutter)] pb-10 pt-[var(--spacing-void-md)]">
        <Eyebrow tone="on-dark" className="mb-3">
          {eyebrowLabel}
        </Eyebrow>

        <Heading variant="display-lg" as="h1" tone="on-dark" className="mb-3">
          {article.title}
        </Heading>

        {excerpt && (
          <p className="text-on-primary/80 text-body-lg line-clamp-3 mb-6">
            {excerpt}
          </p>
        )}

        {/* CTA styled as primary button (decorative span — outer Link handles navigation) */}
        <span className="inline-flex self-start items-center justify-center px-6 py-3 rounded font-label text-label-md uppercase text-on-primary bg-gradient-to-br from-ink to-ink-deep">
          Vollständigen Bericht lesen
        </span>
      </div>
    </Link>
  );
}
