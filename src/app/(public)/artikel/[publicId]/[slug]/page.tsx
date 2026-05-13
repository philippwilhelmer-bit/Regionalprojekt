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

  // Canonical slug enforcement — permanent redirect on wrong slug
  const canonical = slugify(article.title ?? "");
  if (slug !== canonical) {
    permanentRedirect(`/artikel/${publicId}/${canonical}`);
  }

  const canonicalUrl = `${BASE_URL}/artikel/${publicId}/${canonical}`;

  // JSON-LD NewsArticle schema
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

  // Related articles (same first Bezirk, exclude current)
  const firstBezirk = article.bezirke[0]?.bezirk;
  const relatedArticles = firstBezirk
    ? (
        await listArticlesReader({ bezirkIds: [firstBezirk.id], limit: 5 })
      ).filter((a) => a.publicId !== article.publicId)
    : [];

  // Source attribution
  let sourceLabel: string | null = null;
  if (article.source === "OTS_AT") {
    sourceLabel = "Quelle: OTS.at";
  } else if (article.source === "RSS") {
    sourceLabel = "Quelle: RSS";
  }

  // Publication timestamp in de-AT locale
  const publishedAt = article.publishedAt
    ? new Intl.DateTimeFormat("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(article.publishedAt)
    : null;

  // Reading time and publisher name for sidebar
  const readingTime = estimateReadingTime(article.content ?? "");
  const publisherName = config.branding.impressum.publisherName;

  // Parse paragraphs for body rendering
  const paragraphs = (article.content ?? "").split("\n\n").filter(Boolean);

  // Track whether drop cap has been applied (skip blockquotes)
  let dropCapApplied = false;

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-parchment min-h-screen">
        {/* Archival Header */}
        {article.imageUrl ? (
          <>
            <header className="relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title ?? ""}
                className="w-full object-cover max-h-[55vh] img-matte"
                loading="eager"
              />
              {/* Gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Overlay content — title + breadcrumb + date */}
              <div className="absolute bottom-0 left-0 right-0 p-[var(--spacing-gutter)] pb-8 z-10">
                {/* Breadcrumb */}
                <nav className="font-label text-sm text-parchment/80 mb-3" aria-label="Breadcrumb">
                  <Link href="/" className="hover:underline">
                    Startseite
                  </Link>
                  {firstBezirk && (
                    <>
                      <span className="mx-1">/</span>
                      <Link
                        href={`/bezirk/${firstBezirk.slug}`}
                        className="hover:underline"
                      >
                        {firstBezirk.name}
                      </Link>
                    </>
                  )}
                  <span className="mx-1">/</span>
                  <span>Artikel</span>
                </nav>
                <h1 className="font-headline tracking-tight text-parchment text-2xl md:text-3xl font-semibold leading-tight">
                  {article.title}
                </h1>
                {publishedAt && (
                  <p className="text-parchment/70 text-sm mt-2">{publishedAt} Uhr</p>
                )}
              </div>
            </header>
            {article.imageCredit && (
              <p className="text-xs text-slate text-right px-[var(--spacing-gutter)] py-1">
                {article.imageCredit}
              </p>
            )}
          </>
        ) : (
          <header className="bg-parchment-dim px-[var(--spacing-gutter)] pt-8 pb-6">
            {/* Breadcrumb */}
            <nav className="font-label text-sm text-slate mb-4" aria-label="Breadcrumb">
              <Link href="/" className="hover:underline">
                Startseite
              </Link>
              {firstBezirk && (
                <>
                  <span className="mx-1">/</span>
                  <Link
                    href={`/bezirk/${firstBezirk.slug}`}
                    className="hover:underline"
                  >
                    {firstBezirk.name}
                  </Link>
                </>
              )}
              <span className="mx-1">/</span>
              <span>Artikel</span>
            </nav>
            <h1 className="font-headline tracking-tight text-ink text-2xl md:text-3xl font-semibold leading-tight">
              {article.title}
            </h1>
            {publishedAt && (
              <p className="text-slate text-sm mt-2">{publishedAt} Uhr</p>
            )}
          </header>
        )}

        {/* Content column — constrained */}
        <div className="max-w-3xl mx-auto px-[var(--spacing-gutter)] pt-[var(--spacing-vertical)] pb-[var(--spacing-section)]">

          {/* Two-column grid on desktop */}
          <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
            {/* Left column — article body */}
            <div>
              {/* Mobile metadata strip — visible below lg */}
              <div className="lg:hidden flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-slate py-3 mb-[var(--spacing-vertical)]">
                {sourceLabel && <span>{sourceLabel}</span>}
                <span>{readingTime} Min. Lesezeit</span>
                <ShareButton title={article.seoTitle ?? article.title ?? ""} url={canonicalUrl} />
              </div>

              {/* Article body */}
              <article className="max-w-none mb-6">
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
                          ? "drop-cap font-body text-ink leading-relaxed"
                          : "font-body text-ink leading-relaxed mb-[var(--spacing-vertical)]"
                      }
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </article>

              {/* Source attribution + AI label */}
              <div className="flex items-center gap-3 text-xs text-slate mb-4">
                {sourceLabel && <span>{sourceLabel}</span>}
                {article.isAutoGenerated && <span>AI</span>}
              </div>
            </div>

            {/* Right column — desktop sidebar, hidden on mobile */}
            <div className="hidden lg:block">
              <ArticleSidebar
                publisherName={publisherName}
                sourceLabel={sourceLabel}
                readingTime={readingTime}
                publishedAt={publishedAt}
                shareTitle={article.seoTitle ?? article.title ?? ""}
                shareUrl={canonicalUrl}
              />
            </div>
          </div>

          {/* Ad unit — full content width */}
          <div className="mb-8">
            <AdUnit zone="article-detail" />
          </div>

          {/* Related articles — horizontal scroll cards */}
          {relatedArticles.length > 0 && (
            <section aria-labelledby="related-heading">
              <TopMeldungenRow articles={relatedArticles} heading="Weitere Artikel" />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
