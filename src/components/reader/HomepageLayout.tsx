"use client";

import { useEffect, useState } from "react";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { groupArticlesByBezirk } from "@/lib/content/articles";
import type { BezirkItem } from "@/types/bundesland";
import { HeroArticle } from "./HeroArticle";
import { TopMeldungenRow } from "./TopMeldungenRow";
import { MascotGreeting } from "./MascotGreeting";
import { RegionalEditorialCard } from "./RegionalEditorialCard";
import { ListItem } from "./ListItem";
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

  // Flat view articles (when no bezirk selected)
  const flatFirst = allArticles.slice(0, 1);
  const flatList = allArticles.slice(1, 4);
  const flatRemainder = allArticles.slice(4);

  // Empty state
  const isEmpty = allArticles.length === 0 && !hero;

  // Render a bezirk section: RegionalEditorialCard + up to 3 ListItems
  function renderBezirkSection(
    name: string,
    articles: ArticleWithBezirke[],
  ) {
    if (articles.length === 0) return null;
    const [featured, ...rest] = articles;
    const listArticles = rest.slice(0, 3);

    return (
      <section className="px-[var(--spacing-gutter)] py-[var(--spacing-section)]">
        {/* Bezirk section heading — no Styrian flag */}
        <h3 className="font-headline text-lg font-semibold text-primary mb-3 px-0">
          {name}
        </h3>

        {/* Featured card — RegionalEditorialCard */}
        <div className="mb-3">
          <RegionalEditorialCard article={featured} />
        </div>

        {/* Compact list rows */}
        {listArticles.length > 0 && (
          <div className="bg-surface-elevated rounded-sm shadow-sm px-3">
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
      {/* 1. Hero zone — Topmeldung (no bg needed, image fills) */}
      {hero && <HeroArticle article={hero} />}

      {/* 2. MascotGreeting — bg-surface for tonal contrast */}
      <div className="bg-surface py-[var(--spacing-section)]">
        <MascotGreeting />
      </div>

      {/* 3. TopMeldungenRow — bg-background */}
      {filteredPinned.length > 0 && (
        <div className="bg-background py-[var(--spacing-section)]">
          <TopMeldungenRow articles={filteredPinned} />
        </div>
      )}

      {/* 4. Ad slot — bg-surface */}
      <div className="bg-surface px-[var(--spacing-gutter)] py-4">
        <AdUnit zone="hero" />
      </div>

      {/* 5/6. Editorial sections */}
      {hasBezirkSelection ? (
        /* Mein Bezirk — grouped by bezirk */
        <div>
          {/* "Dein Bezirk" heading */}
          <div className="px-[var(--spacing-gutter)] pt-4 pb-1 bg-background">
            <h2 className="font-headline text-xl font-semibold text-primary">
              Dein Bezirk
            </h2>
          </div>

          {bezirkSections.map(({ slug, name, articles }, index) => (
            <div
              key={slug}
              className={index % 2 === 0 ? "bg-background" : "bg-surface"}
            >
              {renderBezirkSection(name, articles)}
              {/* Ad every 2nd section */}
              {(index + 1) % 2 === 0 && (
                <div className="px-[var(--spacing-gutter)] py-2">
                  <AdUnit zone="between-articles" />
                </div>
              )}
            </div>
          ))}

          {/* Empty state for bezirk filter */}
          {bezirkSections.length === 0 && (
            <div className="px-[var(--spacing-gutter)] py-8 text-center text-zinc-500 bg-background">
              <p className="mb-3">Noch keine Nachrichten für deinen Bezirk.</p>
              <button
                onClick={() => {
                  localStorage.removeItem("bezirk_selection");
                  setSelectedSlugs([]);
                }}
                className="text-sm text-primary underline"
              >
                Bezirksauswahl zurücksetzen
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Flat view — all articles */
        <div>
          {/* "Alle Nachrichten" heading */}
          <div className="px-[var(--spacing-gutter)] pt-4 pb-1 bg-background">
            <h2 className="font-headline text-xl font-semibold text-primary">
              Alle Nachrichten
            </h2>
          </div>

          {isEmpty ? (
            <div className="px-[var(--spacing-gutter)] py-8 text-center text-zinc-500 bg-background">
              <p>Noch keine Nachrichten.</p>
            </div>
          ) : (
            <>
              {/* First article as RegionalEditorialCard + next 3 as ListItems */}
              <div className="bg-background px-[var(--spacing-gutter)] py-[var(--spacing-section)]">
                {flatFirst.length > 0 && (
                  <div className="mb-3">
                    <RegionalEditorialCard article={flatFirst[0]} />
                  </div>
                )}
                {flatList.length > 0 && (
                  <div className="bg-surface-elevated rounded-sm shadow-sm px-3">
                    {flatList.map((article) => (
                      <ListItem key={article.id} article={article} />
                    ))}
                  </div>
                )}
              </div>

              {/* Remainder articles in list format — bg-surface */}
              {flatRemainder.length > 0 && (
                <div className="px-[var(--spacing-gutter)] pb-4 bg-surface">
                  <div className="bg-surface-elevated rounded-sm shadow-sm px-3">
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
