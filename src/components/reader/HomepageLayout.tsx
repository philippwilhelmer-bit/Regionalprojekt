"use client";

import { useEffect, useState } from "react";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { groupArticlesByBezirk } from "@/lib/content/articles";
import { HeroArticle } from "./HeroArticle";
import { TopMeldungenRow } from "./TopMeldungenRow";
import { BezirkSection } from "./BezirkSection";
import { ArticleCard } from "./ArticleCard";
import { AdUnit } from "./AdUnit";

interface HomepageLayoutProps {
  hero: ArticleWithBezirke | null;
  pinnedArticles: ArticleWithBezirke[];
  allArticles: ArticleWithBezirke[];
}

export function HomepageLayout({ hero, pinnedArticles, allArticles }: HomepageLayoutProps) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("bezirk_selection");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSelectedSlugs(parsed as string[]);
        }
      } catch {
        // Invalid JSON — ignore and treat as "no selection"
      }
    }
    setMounted(true);
  }, []);

  // Derive filtered pinned articles
  const filteredPinned = selectedSlugs.length === 0
    ? pinnedArticles
    : pinnedArticles.filter((a) =>
        a.isStateWide ||
        a.bezirke.some((entry) => selectedSlugs.includes(entry.bezirk.slug))
      );

  // Derive bezirk sections or flat view
  const hasBezirkSelection = mounted && selectedSlugs.length > 0;

  let bezirkSections: Array<{ slug: string; name: string; articles: ArticleWithBezirke[] }> = [];
  if (hasBezirkSelection) {
    const grouped = groupArticlesByBezirk(allArticles);
    bezirkSections = Array.from(grouped.entries())
      .filter(([slug]) => selectedSlugs.includes(slug))
      .map(([slug, { name, articles }]) => ({ slug, name, articles }));
  }

  // Flat grid articles (when no bezirk selected)
  const flatGrid = allArticles.slice(0, 9);
  const flatRemainder = allArticles.slice(9);

  // Empty state
  const isEmpty = allArticles.length === 0 && !hero;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero zone */}
      {hero && <HeroArticle article={hero} />}

      {/* Top-Meldungen row */}
      {filteredPinned.length > 0 && (
        <TopMeldungenRow articles={filteredPinned} />
      )}

      {/* Ad slot between top-stories and editorial sections */}
      <div className="px-4 pb-4">
        <AdUnit zone="hero" />
      </div>

      {/* Sections heading */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="font-headline text-lg font-semibold text-zinc-900">
          {hasBezirkSelection ? "Mein Bezirk" : "Alle Nachrichten"}
        </h2>
      </div>

      {/* Editorial sections */}
      {hasBezirkSelection ? (
        /* Grouped by bezirk */
        <div>
          {bezirkSections.map(({ slug, name, articles }, index) => (
            <div key={slug}>
              <BezirkSection
                bezirkName={name}
                articles={articles}
                showDivider={index > 0}
              />
              {/* Ad every 2nd section (after sections 1, 3, 5 ...) */}
              {(index + 1) % 2 === 0 && (
                <div className="px-4 py-2">
                  <AdUnit zone="between-articles" />
                </div>
              )}
            </div>
          ))}

          {/* Empty state for bezirk filter */}
          {bezirkSections.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p className="mb-3">Noch keine Nachrichten für deinen Bezirk.</p>
              <button
                onClick={() => {
                  localStorage.removeItem("bezirk_selection");
                  setSelectedSlugs([]);
                }}
                className="text-sm text-styrian-green underline"
              >
                Bezirksauswahl zurücksetzen
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Flat grid — no bezirk selection */
        <div>
          {isEmpty ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p>Noch keine Nachrichten.</p>
            </div>
          ) : (
            <>
              <BezirkSection
                bezirkName="Alle Nachrichten"
                articles={flatGrid}
                showDivider={false}
              />

              {/* Remainder articles in simple card list */}
              {flatRemainder.length > 0 && (
                <div className="px-4 flex flex-col gap-3 pb-4">
                  {flatRemainder.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
