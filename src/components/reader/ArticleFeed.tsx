"use client";

import { useEffect, useRef, useState } from "react";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { ArticleCard } from "./ArticleCard";
import { AdUnit } from "./AdUnit";

interface ArticleFeedProps {
  initialArticles: ArticleWithBezirke[];
}

export function ArticleFeed({ initialArticles }: ArticleFeedProps) {
  const [articles, setArticles] = useState<ArticleWithBezirke[]>(initialArticles);
  const [offset, setOffset] = useState(initialArticles.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length >= 20);
  const [feedHeading, setFeedHeading] = useState("Alle Nachrichten");
  const [bezirkSlugs, setBezirkSlugs] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // On mount: read localStorage and personalize feed
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bezirk_selection");
      if (raw) {
        const slugs: string[] = JSON.parse(raw);
        if (Array.isArray(slugs) && slugs.length > 0) {
          setBezirkSlugs(slugs);
          setFeedHeading("Mein Bezirk");
          // Fetch personalized initial articles
          fetchArticles(slugs, 0, true);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: observe sentinel
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, offset, bezirkSlugs]);

  async function fetchArticles(
    slugs: string[],
    currentOffset: number,
    replace: boolean
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", offset: String(currentOffset) });
      if (slugs.length > 0) params.set("bezirkSlugs", slugs.join(","));
      const res = await fetch(`/api/reader/articles?${params.toString()}`);
      if (!res.ok) return;
      const data: ArticleWithBezirke[] = await res.json();
      if (replace) {
        setArticles(data);
        setOffset(data.length);
      } else {
        setArticles((prev) => [...prev, ...data]);
        setOffset((prev) => prev + data.length);
      }
      setHasMore(data.length >= 20);
    } catch {
      // Network error — silently fail, keep current articles
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    fetchArticles(bezirkSlugs, offset, false);
  }

  function clearSelection() {
    try {
      localStorage.setItem("bezirk_selection", JSON.stringify([]));
    } catch {
      // Ignore
    }
    window.location.reload();
  }

  if (articles.length === 0 && !loading) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-zinc-500 mb-4">
          Noch keine Nachrichten für deine Bezirke.
        </p>
        <button
          onClick={clearSelection}
          className="text-blue-600 underline text-sm hover:text-blue-700"
        >
          Alle Nachrichten anzeigen
        </button>
      </div>
    );
  }

  return (
    <section aria-label={feedHeading}>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-zinc-900">{feedHeading}</h1>
        <p className="text-xs text-zinc-500">Steiermark Aktuell</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        {articles.map((article, index) => (
          <div key={article.id}>
            <ArticleCard
              article={article}
              featured={article.isFeatured}
            />
            {/* Insert ad after every 5th article (index 4, 9, 14…) */}
            {(index + 1) % 5 === 0 && (
              <div className="mt-3">
                <AdUnit zone="between-articles" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-6" aria-label="Lädt…">
          <div className="w-6 h-6 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Sentinel for IntersectionObserver */}
      {hasMore && !loading && (
        <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      )}

      {!hasMore && articles.length > 0 && (
        <p className="text-center text-xs text-zinc-400 py-6">
          Alle Nachrichten geladen
        </p>
      )}
    </section>
  );
}
