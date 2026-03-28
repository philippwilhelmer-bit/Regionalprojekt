"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import config from '@/../bundesland.config';
import type { BezirkItem } from '@/types/bundesland';
import { computeBezirkLabel } from '@/lib/bezirk-label';

export function Header({ bezirke }: { bezirke: BezirkItem[] }) {
  const [bezirkLabel, setBezirkLabel] = useState<string>("Steiermark");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bezirk_selection");
      if (raw) {
        const slugs: string[] = JSON.parse(raw);
        if (Array.isArray(slugs) && slugs.length > 0) {
          setBezirkLabel(computeBezirkLabel(slugs, bezirke));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [bezirke]);

  function handleBezirkClick() {
    window.dispatchEvent(new CustomEvent("openBezirkModal"));
  }

  return (
    <div className="sticky top-0 z-40">
      {/* HDR-01: Styrian identity stripe — 2px white + 2px green matching the Styrian flag */}
      <div
        className="w-full h-[4px]"
        style={{ background: 'linear-gradient(to bottom, #fff 50%, #2D5A27 50%)' }}
        aria-hidden="true"
      />

      {/* HDR-02: Dark green editorial header */}
      <header className="bg-primary px-4 h-14 flex items-center justify-between">
        <span className="font-headline italic text-white text-xl">{config.siteName}</span>

        <div className="flex items-center gap-3">
          {/* HDR-03: Location badge / Bezirk selector */}
          <button
            onClick={handleBezirkClick}
            className="flex items-center gap-1 text-white text-sm hover:opacity-80 transition-opacity"
            aria-label="Bezirk auswählen"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
            <span>{bezirkLabel}</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_drop_down</span>
          </button>

          {/* HDR-04: Search icon — links to /suche */}
          <Link
            href="/suche"
            className="material-symbols-outlined text-white hover:opacity-80 transition-opacity"
            aria-label="Zur Suche"
          >
            search
          </Link>
        </div>
      </header>
    </div>
  );
}
