"use client";

import { useState, useEffect } from "react";
import type { BezirkItem } from "@/types/bundesland";

const STORAGE_KEY = "bezirk_selection";

interface RegionalSelectorProps {
  bezirke: BezirkItem[];
  bundeslandName?: string;
  onSelectionChange: (slugs: string[]) => void;
}

export function RegionalSelector({
  bezirke,
  bundeslandName = "Steiermark",
  onSelectionChange,
}: RegionalSelectorProps) {
  const [level, setLevel] = useState<"bundesland" | "bezirk">("bundesland");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedSlugs(parsed);
          setLevel("bezirk");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function selectBezirk(slug: string) {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter((s) => s !== slug)
      : [...selectedSlugs, slug];
    setSelectedSlugs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    onSelectionChange(next);
  }

  function drillDown() {
    setLevel("bezirk");
  }

  function drillUp() {
    setLevel("bundesland");
    setSelectedSlugs([]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }
    onSelectionChange([]);
  }

  return (
    <div className="px-4 py-3">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-1 text-xs text-zinc-400 mb-3">
        <button
          onClick={drillUp}
          className={
            "transition-colors " +
            (level === "bundesland"
              ? "text-styrian-green font-semibold"
              : "hover:text-styrian-green")
          }
        >
          {bundeslandName}
        </button>
        {level === "bezirk" && (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-styrian-green font-semibold">Bezirk</span>
          </>
        )}
      </nav>

      {level === "bundesland" ? (
        <button
          onClick={drillDown}
          className="w-full flex items-center justify-between py-3 px-4 bg-white border border-zinc-200 rounded-sm hover:border-styrian-green transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Styrian flag icon */}
            <div
              className="rounded-sm flex-shrink-0"
              style={{
                width: 24,
                height: 16,
                background: "linear-gradient(to bottom, #fff 50%, #2D5A27 50%)",
              }}
            />
            <span className="text-sm font-medium text-zinc-900">{bundeslandName}</span>
          </div>
          <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {bezirke.map((bezirk) => {
            const isSelected = selectedSlugs.includes(bezirk.slug);
            return (
              <button
                key={bezirk.slug}
                onClick={() => selectBezirk(bezirk.slug)}
                className={
                  "py-1.5 px-3 rounded-sm border text-xs font-medium transition-colors " +
                  (isSelected
                    ? "border-styrian-green bg-cream text-styrian-green"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400")
                }
              >
                {bezirk.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
