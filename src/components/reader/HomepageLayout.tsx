"use client";

import { useEffect, useState } from "react";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { groupArticlesByBezirk } from "@/lib/content/articles";
import type { BezirkItem } from "@/types/bundesland";
import { HeroArticle } from "./HeroArticle";
import { TopMeldungenRow } from "./TopMeldungenRow";
import { ArticleCard } from "./ArticleCard";
import { ListItem } from "./ListItem";
import { RegionalSelector } from "./RegionalSelector";
import { AdUnit } from "./AdUnit";

interface HomepageLayoutProps {
  hero: ArticleWithBezirke | null;
  pinnedArticles: ArticleWithBezirke[];
  allArticles: ArticleWithBezirke[];
  bezirke?: BezirkItem[];
}

export function HomepageLayout({ hero, pinnedArticles, allArticles, bezirke = [] }: HomepageLayoutProps) {
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

  function handleSelectionChange(slugs: string[]) {
    setSelectedSlugs(slugs);
  }

  // Render a "Dein Bezirk" section with feature card + list items
  function renderBezirkSection(
    name: string,
    articles: ArticleWithBezirke[],
    showDivider: boolean,
  ) {
    if (articles.length === 0) return null;
    const [featured, ...rest] = articles;
    const listArticles = rest.slice(0, 4);

    return (
      <section className="px-4 py-4" key={name}>
        {showDivider && (
          <hr
            className="border-0 h-px my-6"
            style={{
              background: "linear-gradient(to right, transparent, #8B7355 20%, #8B7355 80%, transparent)",
            }}
          />
        )}

        {/* Styrian flag accent */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="rounded-sm flex-shrink-0"
            style={{
              width: 24,
              height: 16,
              background: "linear-gradient(to bottom, #fff 50%, #2D5A27 50%)",
            }}
          />
          <h2 className="font-headline text-lg font-semibold text-styrian-green">
            {name}
          </h2>
        </div>

        {/* Feature Card — main local story */}
        <div className="mb-3">
          <ArticleCard article={featured} featured />
        </div>

        {/* Secondary stories as ListItems */}
        {listArticles.length > 0 && (
          <div className="bg-white rounded-sm border border-cream-dark px-3">
            {listArticles.map((article) => (
              <ListItem key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero zone — Topmeldung */}
      {hero && <HeroArticle article={hero} />}

      {/* Top-Meldungen row */}
      {filteredPinned.length > 0 && (
        <TopMeldungenRow articles={filteredPinned} />
      )}

      {/* Ad slot between top-stories and editorial sections */}
      <div className="px-4 pb-4">
        <AdUnit zone="hero" />
      </div>

      {/* Regional Hierarchy Selector */}
      {bezirke.length > 0 && (
        <RegionalSelector
          bezirke={bezirke}
          onSelectionChange={handleSelectionChange}
        />
      )}

      {/* "Dein Bezirk" heading */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="font-headline text-xl font-semibold text-zinc-900">
          {hasBezirkSelection ? "Dein Bezirk" : "Alle Nachrichten"}
        </h2>
      </div>

      {/* Editorial sections */}
      {hasBezirkSelection ? (
        /* Grouped by bezirk — feature card + list items layout */
        <div>
          {bezirkSections.map(({ slug, name, articles }, index) => (
            <div key={slug}>
              {renderBezirkSection(name, articles, index > 0)}
              {/* Ad every 2nd section */}
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
        /* Flat view — feature card + list items for all articles */
        <div>
          {isEmpty ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p>Noch keine Nachrichten.</p>
            </div>
          ) : (
            <>
              {renderBezirkSection("Alle Nachrichten", flatGrid, false)}

              {/* Remainder articles in list format */}
              {flatRemainder.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="bg-white rounded-sm border border-cream-dark px-3">
                    {flatRemainder.map((article) => (
                      <ListItem key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
