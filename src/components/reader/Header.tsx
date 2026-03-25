"use client";

import { useEffect, useState } from "react";
import config from '@/../bundesland.config';
import type { BezirkItem } from '@/types/bundesland';

export function Header({ bezirke }: { bezirke: BezirkItem[] }) {
  const [bezirkLabel, setBezirkLabel] = useState<string>("Steiermark");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bezirk_selection");
      if (raw) {
        const slugs: string[] = JSON.parse(raw);
        if (Array.isArray(slugs) && slugs.length > 0) {
          const bezirkNames = Object.fromEntries(bezirke.map(b => [b.slug, b.name]));
          const firstName = bezirkNames[slugs[0]] ?? slugs[0];
          setBezirkLabel(
            slugs.length > 1 ? `${firstName} +${slugs.length - 1}` : firstName
          );
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
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 px-4 h-14 flex items-center justify-between">
      <span className="font-bold text-zinc-900">{config.siteName}</span>
      <button
        onClick={handleBezirkClick}
        className="text-sm text-zinc-600 flex items-center gap-1 hover:text-zinc-900 transition-colors"
        aria-label="Bezirk auswählen"
      >
        {bezirkLabel}
        <span aria-hidden="true">▾</span>
      </button>
    </header>
  );
}
