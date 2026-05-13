"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type ArticleWithBezirke } from "@/lib/content/articles-utils";
import type { BezirkItem } from "@/types/bundesland";
import { HeroArticle } from "./HeroArticle";
import { MascotGreeting } from "./MascotGreeting";
import { EditorialStackCard } from "./EditorialStackCard";
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
  bezirke: BezirkItem[];
}

export function HomepageLayout({
  hero,
  pinnedArticles,
  allArticles,
  grueneWocheArticles = [],
  bezirke,
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

  // Build flat list of articles for the editorial stack.
  // When a bezirk filter is active, restrict to articles tagged with the selected bezirke.
  const bezirkArticles: ArticleWithBezirke[] = hasBezirkSelection
    ? allArticles.filter((a) =>
        a.bezirke.some((entry) => selectedSlugs.includes(entry.bezirk.slug)),
      )
    : allArticles;

  const isEmpty = allArticles.length === 0 && !hero;

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
        <MascotGreeting bezirke={bezirke} />
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

      {/* 6. Mein Bezirk — surface, editorial card stack */}
      <SectionBlock bg="surface" voidSize="md">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <Heading variant="headline-md" className="mb-1">Mein Bezirk</Heading>
            <p className="font-body text-sm text-ink-muted">Aktuelles aus deiner Region</p>
          </div>
          <Link
            href="/suche"
            className="font-label text-sm text-accent transition-colors hover:text-primary shrink-0 mt-1"
          >
            Alle anzeigen
          </Link>
        </div>

        {isEmpty && (
          <div className="py-8 text-center text-ink/50">
            <p>Noch keine Nachrichten.</p>
          </div>
        )}

        {!isEmpty && bezirkArticles.length === 0 && hasBezirkSelection && (
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

        {bezirkArticles.length > 0 && (
          <div className="space-y-6">
            {bezirkArticles.slice(0, 3).map((article) => (
              <EditorialStackCard key={article.id} article={article} variant="hero" />
            ))}
            {bezirkArticles.slice(3).length > 0 && (
              <div className="divide-y divide-outline-variant/20">
                {bezirkArticles.slice(3, 8).map((article) => (
                  <EditorialStackCard key={article.id} article={article} variant="row" />
                ))}
              </div>
            )}
          </div>
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
