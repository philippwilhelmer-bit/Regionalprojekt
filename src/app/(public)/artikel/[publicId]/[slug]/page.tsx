import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getArticleByPublicId, listArticlesReader } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";
import { buildArticleMetadata } from "@/lib/reader/metadata";
import { isBlockquote, stripBlockquotePrefix, estimateReadingTime } from "@/lib/reader/article-utils";
import { AdUnit } from "@/components/reader/AdUnit";
import { ShareButton } from "@/components/reader/ShareButton";
import { ArticleSidebar } from "@/components/reader/ArticleSidebar";
import { TopMeldungenRow } from "@/components/reader/TopMeldungenRow";
import { SeppTipBox } from "@/components/reader/SeppTipBox";
import { Eyebrow } from "@/components/ui/Eyebrow";
import config from "@/../bundesland.config";

type Props = { params: Promise<{ publicId: string; slug: string }> };

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.lodenundleute.at";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params;
  const article = await getArticleByPublicId(publicId);
  return buildArticleMetadata(article, BASE_URL);
}

export default async function ArticlePage({ params }: Props) {
  const { publicId, slug } = await params;

  const article = await getArticleByPublicId(publicId);
  if (!article) notFound();

  const canonical = slugify(article.title ?? "");
  if (slug !== canonical) {
    permanentRedirect(`/artikel/${publicId}/${canonical}`);
  }

  const canonicalUrl = `${BASE_URL}/artikel/${publicId}/${canonical}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.seoTitle ?? article.title,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Organization", name: config.branding.impressum.publisherName },
    publisher: { "@type": "Organization", name: config.branding.impressum.publisherName },
    url: canonicalUrl,
  };

  const firstBezirk = article.bezirke[0]?.bezirk;
  const relatedArticles = firstBezirk
    ? (
        await listArticlesReader({ bezirkIds: [firstBezirk.id], limit: 5 })
      ).filter((a) => a.publicId !== article.publicId)
    : [];

  let sourceLabel: string | null = null;
  if (article.source === "OTS_AT") {
    sourceLabel = "Quelle: OTS.at";
  } else if (article.source === "RSS") {
    sourceLabel = "Quelle: RSS";
  }

  const publishedAt = article.publishedAt
    ? new Intl.DateTimeFormat("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(article.publishedAt)
    : null;

  const eyebrowParts: string[] = [];
  if (firstBezirk) eyebrowParts.push(firstBezirk.name);
  if (publishedAt) eyebrowParts.push(publishedAt);
  const eyebrowText = eyebrowParts.join(" • ");

  const readingTime = estimateReadingTime(article.content ?? "");
  const publisherName = config.branding.impressum.publisherName;

  const paragraphs = (article.content ?? "").split("\n\n").filter(Boolean);
  let dropCapApplied = false;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-background min-h-screen">
        <main className="max-w-5xl mx-auto px-[var(--spacing-gutter)] pt-12 md:pt-20 pb-24">
          {/* Editorial Header — eyebrow + huge headline */}
          <div className="mb-12 md:mb-20">
            {eyebrowText && (
              <Eyebrow className="mb-4 tracking-[0.2em] text-accent font-semibold">
                {eyebrowText}
              </Eyebrow>
            )}

            <h1 className="font-headline tracking-tight text-primary text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.95] mb-6">
              {article.title}
            </h1>

            {/* Breadcrumb minimal — secondary navigation */}
            <nav className="font-label text-sm text-ink-muted" aria-label="Breadcrumb">
              <Link href="/" className="transition-colors hover:text-accent">Startseite</Link>
              {firstBezirk && (
                <>
                  <span className="mx-2">/</span>
                  <Link
                    href={`/bezirk/${firstBezirk.slug}`}
                    className="transition-colors hover:text-accent"
                  >
                    {firstBezirk.name}
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Hero image — full-width, below editorial header */}
          {article.imageUrl && (
            <div className="relative w-full aspect-[16/9] mb-12 md:mb-20 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title ?? ""}
                className="w-full h-full object-cover grayscale-[0.2] contrast-110"
                loading="eager"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-primary/10 mix-blend-multiply"
              />
            </div>
          )}
          {article.imageCredit && (
            <p className="text-xs text-ink-muted text-right mb-12 -mt-8">
              {article.imageCredit}
            </p>
          )}

          {/* Mobile metadata strip — visible below md */}
          <div className="md:hidden flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted mb-8">
            <span>{readingTime} Min. Lesezeit</span>
            {sourceLabel && <span>{sourceLabel}</span>}
          </div>

          {/* Article body — 12-col grid on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-16">
            {/* Aside — desktop-only sticky sidebar */}
            <div className="hidden md:block md:col-span-3">
              <ArticleSidebar
                publisherName={publisherName}
                sourceLabel={sourceLabel}
                readingTime={readingTime}
                publishedAt={publishedAt}
                shareTitle={article.seoTitle ?? article.title ?? ""}
                shareUrl={canonicalUrl}
              />
            </div>

            <article className="md:col-span-8 md:col-start-5 space-y-8">
              {paragraphs.map((paragraph, index) => {
                if (isBlockquote(paragraph)) {
                  return (
                    <blockquote key={index} className="article-blockquote">
                      {stripBlockquotePrefix(paragraph)}
                    </blockquote>
                  );
                }
                const isFirst = !dropCapApplied;
                if (!dropCapApplied) dropCapApplied = true;
                return (
                  <p
                    key={index}
                    className={
                      isFirst
                        ? "drop-cap font-body text-lg md:text-xl leading-relaxed text-ink"
                        : "font-body text-lg md:text-xl leading-relaxed text-ink"
                    }
                  >
                    {paragraph}
                  </p>
                );
              })}

              {/* Sepp tip-box at end of article body */}
              <SeppTipBox />

              {/* Source attribution + AI label */}
              {(sourceLabel || article.isAutoGenerated) && (
                <div className="flex items-center gap-3 text-xs text-ink-muted pt-4">
                  {sourceLabel && <span>{sourceLabel}</span>}
                  {article.isAutoGenerated && <span>AI</span>}
                </div>
              )}

              {/* Mobile share fallback — sidebar already covers desktop */}
              <div className="md:hidden pt-4 border-t border-outline-variant/20">
                <ShareButton
                  title={article.seoTitle ?? article.title ?? ""}
                  url={canonicalUrl}
                />
              </div>
            </article>
          </div>

          {/* Ad — between article and related */}
          <div className="mb-12">
            <AdUnit zone="article-detail" />
          </div>

          {/* Related articles — same bezirk */}
          {relatedArticles.length > 0 && (
            <section aria-labelledby="related-heading">
              <TopMeldungenRow articles={relatedArticles} heading="Weitere Artikel" />
            </section>
          )}
        </main>
      </div>
    </>
  );
}
