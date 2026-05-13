"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { groupArticlesByBezirk, type ArticleWithBezirke } from "@/lib/content/articles-utils";
import { HeroArticle } from "./HeroArticle";
import { MascotGreeting } from "./MascotGreeting";
import { RegionalEditorialCard } from "./RegionalEditorialCard";
import { ListItem } from "./ListItem";
import { AdUnit } from "./AdUnit";
import { WeatherWidget } from "./WeatherWidget";
import { FragDenSeppCard } from "./FragDenSeppCard";
import { GrueneWocheSection } from "./GrueneWocheSection";
import { TopMeldungenRow } from "./TopMeldungenRow";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { Heading } from "@/components/ui/Heading";

interface HomepageLayoutProps {
  hero: ArticleWithBezirke | null;
  pinnedArticles: ArticleWithBezirke[];
  allArticles: ArticleWithBezirke[];
  grueneWocheArticles?: ArticleWithBezirke[];
}

export function HomepageLayout({
  hero,
  pinnedArticles,
  allArticles,
  grueneWocheArticles = [],
}: HomepageLayoutProps) {
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
        // Invalid JSON — ignore
      }
    }
    setMounted(true);
  }, []);

  const hasBezirkSelection = mounted && selectedSlugs.length > 0;

  // Pinned articles filter — show statewide pins always, plus pins matching
  // the selected bezirks when the user has picked any.
  const filteredPinned = hasBezirkSelection
    ? pinnedArticles.filter(
        (a) =>
          a.isStateWide ||
          a.bezirke.some((entry) => selectedSlugs.includes(entry.bezirk.slug)),
      )
    : pinnedArticles;

  let bezirkSections: Array<{ slug: string; name: string; articles: ArticleWithBezirke[] }> = [];
  if (hasBezirkSelection) {
    const grouped = groupArticlesByBezirk(allArticles);
    bezirkSections = Array.from(grouped.entries())
      .filter(([slug]) => selectedSlugs.includes(slug))
      .map(([slug, { name, articles }]) => ({ slug, name, articles }));
  }

  const flatFeatured = allArticles[0];
  const flatList = allArticles.slice(1);
  const isEmpty = allArticles.length === 0 && !hero;

  function renderBezirkGroup(name: string, articles: ArticleWithBezirke[]) {
    if (articles.length === 0) return null;
    const [featured, ...rest] = articles;
    const listArticles = rest.slice(0, 3);

    return (
      <div className="mb-6">
        <h3 className="font-headline tracking-tight text-headline-md text-ink mb-3">{name}</h3>
        <div className="mb-3">
          <RegionalEditorialCard article={featured} />
        </div>
        {listArticles.length > 0 && (
          <div className="bg-surface-elevated rounded-sm shadow-sm px-3">
            {listArticles.map((article) => (
              <ListItem key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 1. Hero — Topmeldung, full-bleed photo */}
      {hero && <HeroArticle article={hero} />}

      {/* 2. Wetter — parchment, prominent under hero */}
      <SectionBlock bg="parchment" voidSize="md">
        <WeatherWidget />
      </SectionBlock>

      {/* 3. Mascot — surface, tonal shift down */}
      <SectionBlock bg="surface" voidSize="md">
        <MascotGreeting />
      </SectionBlock>

      {/* 4. TopMeldungen — horizontal article overview slider */}
      {filteredPinned.length > 0 && (
        <SectionBlock bg="parchment" voidSize="none" gutter={false}>
          <TopMeldungenRow articles={filteredPinned} />
        </SectionBlock>
      )}

      {/* 5. Ad slot — surface, compact (no big void) */}
      <SectionBlock bg="surface" voidSize="none">
        <div className="py-4">
          <AdUnit zone="between-articles" />
        </div>
      </SectionBlock>

      {/* 6. Mein Bezirk — surface, with "Alle Nachrichten" exit link */}
      <SectionBlock bg="surface" voidSize="md">
        <div className="flex items-baseline justify-between mb-4">
          <Heading variant="headline-md">Mein Bezirk</Heading>
          <Link
            href="/suche"
            className="font-label text-label-md uppercase text-ink-muted underline decoration-2 underline-offset-4 transition-colors hover:text-accent"
          >
            Alle Nachrichten
          </Link>
        </div>

        {isEmpty && (
          <div className="py-8 text-center text-ink/50">
            <p>Noch keine Nachrichten.</p>
          </div>
        )}

        {!isEmpty && hasBezirkSelection && (
          <>
            {bezirkSections.map(({ slug, name, articles }) => (
              <div key={slug}>{renderBezirkGroup(name, articles)}</div>
            ))}
            {bezirkSections.length === 0 && (
              <div className="py-8 text-center text-ink/50">
                <p className="mb-3">Noch keine Nachrichten für deinen Bezirk.</p>
                <button
                  onClick={() => {
                    localStorage.removeItem("bezirk_selection");
                    setSelectedSlugs([]);
                  }}
                  className="text-sm text-ink-muted underline"
                >
                  Bezirksauswahl zurücksetzen
                </button>
              </div>
            )}
          </>
        )}

        {!isEmpty && !hasBezirkSelection && (
          <>
            {flatFeatured && (
              <div className="mb-3">
                <RegionalEditorialCard article={flatFeatured} />
              </div>
            )}
            {flatList.length > 0 && (
              <div className="bg-surface-elevated rounded-sm shadow-sm px-3">
                {flatList.map((article) => (
                  <ListItem key={article.id} article={article} />
                ))}
              </div>
            )}
          </>
        )}
      </SectionBlock>

      {/* 7. Frag den Sepp — surface-deep (dark loden), Bezirk-Modal-Trigger */}
      <SectionBlock bg="surface-deep" voidSize="md">
        <FragDenSeppCard />
      </SectionBlock>

      {/* 8. Ad slot — parchment */}
      <SectionBlock bg="parchment" voidSize="none">
        <div className="py-4">
          <AdUnit zone="between-articles" />
        </div>
      </SectionBlock>

      {/* 9. Das Archiv der Woche — parchment, editorial cards */}
      {grueneWocheArticles.length > 0 && (
        <SectionBlock bg="parchment" voidSize="md">
          <GrueneWocheSection articles={grueneWocheArticles} />
        </SectionBlock>
      )}
    </div>
  );
}
