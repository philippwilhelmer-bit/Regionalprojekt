import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getArticleByPublicId, listArticlesReader } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";
import { buildArticleMetadata } from "@/lib/reader/metadata";
import { AdUnit } from "@/components/reader/AdUnit";
import { ShareButton } from "@/components/reader/ShareButton";
import { TopMeldungenRow } from "@/components/reader/TopMeldungenRow";
import config from "@/../bundesland.config";

type Props = { params: Promise<{ publicId: string; slug: string }> };

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.ennstal-aktuell.at";

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

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-cream min-h-screen">
        {/* Hero image — full bleed, outside content column */}
        {article.imageUrl && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt={article.title ?? ""}
              className="w-full object-cover max-h-[50vh] img-matte"
              loading="eager"
            />
            {article.imageCredit && (
              <figcaption className="text-xs text-zinc-400 text-right px-4 py-1">
                {article.imageCredit}
              </figcaption>
            )}
          </figure>
        )}

        {/* Content column — constrained */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="font-label text-sm text-sage mb-4" aria-label="Breadcrumb">
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

          {/* Article header */}
          <header className="mb-6">
            <h1 className="font-headline text-2xl font-bold text-zinc-800 leading-tight mb-2">
              {article.title}
            </h1>
            {publishedAt && (
              <p className="font-label text-sm text-sage">{publishedAt} Uhr</p>
            )}
          </header>

          {/* Share button — positioned below headline, before article body */}
          <div className="mb-6">
            <ShareButton
              title={article.seoTitle ?? article.title ?? ""}
              url={canonicalUrl}
            />
          </div>

          {/* AI disclosure — before article body */}
          {article.isAutoGenerated && (
            <div className="rounded-sm bg-cream border border-sage/30 px-4 py-3 text-sm text-sage mb-6">
              Dieser Artikel wurde automatisch von KI generiert und redaktionell
              geprueft.
            </div>
          )}

          {/* Article body */}
          <article className="prose max-w-none mb-6 prose-p:text-[#2a2a2a] prose-headings:font-headline prose-a:text-styrian-green prose-a:underline">
            {(article.content ?? "").split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>

          {/* Source attribution */}
          {sourceLabel && (
            <p className="text-xs text-sage/70 mb-4">{sourceLabel}</p>
          )}

          {/* Ad unit */}
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
