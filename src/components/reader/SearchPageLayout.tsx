"use client";

import { useState, useMemo } from "react";
import type { Bezirk } from "@prisma/client";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { ArticleCard } from "@/components/reader/ArticleCard";

interface SearchPageLayoutProps {
  articles: ArticleWithBezirke[];
  bezirke: Bezirk[];
  recommended: ArticleWithBezirke[];
}

export function SearchPageLayout({ articles, bezirke, recommended }: SearchPageLayoutProps) {
  const [query, setQuery] = useState("");
  const [activeBezirkId, setActiveBezirkId] = useState<number | null>(null);

  const isFiltered = useMemo(
    () => query.trim() !== "" || activeBezirkId !== null,
    [query, activeBezirkId]
  );

  const filtered = useMemo(() => {
    let result = articles;

    if (activeBezirkId !== null) {
      result = result.filter((a) =>
        a.bezirke.some((entry) => entry.bezirkId === activeBezirkId)
      );
    }

    if (query.trim() !== "") {
      const q = query.toLowerCase();
      result = result.filter((a) => a.title?.toLowerCase().includes(q));
    }

    return result;
  }, [articles, query, activeBezirkId]);

  function toggleBezirk(id: number) {
    setActiveBezirkId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="bg-cream min-h-screen">
      {/* Zone 1 — Search input (SRCH-01) */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-headline text-3xl text-zinc-900 mb-4">Suche</h1>
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-sage"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artikel suchen…"
            className="w-full font-headline text-xl bg-transparent border-b-2 border-sage/40 focus:border-styrian-green outline-none pb-2 pl-8 pr-8 text-zinc-900 placeholder:text-zinc-400"
          />
          {query !== "" && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-sage hover:text-zinc-700"
              aria-label="Suche löschen"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Zone 2 — Trending pills (SRCH-02) */}
      <section className="px-4 pb-4">
        <h2 className="font-label text-xs uppercase tracking-wider text-sage mb-2">
          Beliebte Themen
        </h2>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
          {bezirke.map((b) => (
            <button
              key={b.id}
              onClick={() => toggleBezirk(b.id)}
              className={
                "shrink-0 px-3 py-1 rounded-full text-sm font-label transition-colors " +
                (activeBezirkId === b.id
                  ? "bg-styrian-green text-white"
                  : "bg-white border border-sage/30 text-sage hover:border-styrian-green hover:text-styrian-green")
              }
            >
              {b.name}
            </button>
          ))}
        </div>
      </section>

      {/* Filtered results or discovery zones */}
      {isFiltered ? (
        <>
          <div className="px-4 pb-3">
            <button
              onClick={() => { setQuery(""); setActiveBezirkId(null); }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-sm border border-styrian-green text-styrian-green font-label text-sm font-medium hover:bg-styrian-green hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span>
              Alle Bezirke anzeigen
            </button>
          </div>
          <p className="px-4 pb-2 text-sm text-sage">{filtered.length} Artikel gefunden</p>
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-headline text-xl text-zinc-600 mb-2">Keine Artikel gefunden</p>
              <p className="text-sm text-zinc-400">
                Versuchen Sie einen anderen Suchbegriff oder wählen Sie einen Bezirk.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4 pb-6">
              {filtered.map((a) => (
                <ArticleCard article={a} key={a.id} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Zone 3 — Category grid (SRCH-03) */}
          <section className="px-4 pb-6">
            <h2 className="font-label text-xs uppercase tracking-wider text-sage mb-3">
              Alle Bezirke
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {bezirke.map((b) => (
                <button
                  key={b.id}
                  onClick={() => toggleBezirk(b.id)}
                  className={
                    "text-left p-3 rounded-sm border transition-colors " +
                    (activeBezirkId === b.id
                      ? "border-styrian-green bg-styrian-green/10 text-styrian-green"
                      : "border-zinc-200 bg-white hover:border-sage/60 text-zinc-800")
                  }
                >
                  <span
                    className="material-symbols-outlined text-sage text-lg block mb-1"
                    aria-hidden="true"
                  >
                    location_city
                  </span>
                  <span className="font-label text-sm font-medium">{b.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Zone 4 — Empfohlene Artikel (SRCH-04) */}
          <section className="px-4 pb-6">
            <h2 className="font-headline text-xl text-zinc-900 mb-3">Empfohlene Artikel</h2>
            <div className="grid grid-cols-2 gap-3">
              {recommended.slice(0, 6).map((a) => (
                <ArticleCard article={a} key={a.id} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
