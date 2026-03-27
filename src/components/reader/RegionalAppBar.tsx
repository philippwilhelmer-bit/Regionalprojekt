"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import config from "@/../bundesland.config";
import type { BezirkItem } from "@/types/bundesland";
import { computeBezirkLabel } from "@/lib/bezirk-label";

interface RegionalAppBarProps {
  bezirke: BezirkItem[];
}

export function RegionalAppBar({ bezirke }: RegionalAppBarProps) {
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
      {/* Styrian flag stripe */}
      <div
        className="w-full h-[4px]"
        style={{ background: "linear-gradient(to bottom, #fff 50%, #2D5A27 50%)" }}
        aria-hidden="true"
      />

      {/* App bar */}
      <header className="bg-styrian-green px-4 h-14 flex items-center justify-center relative">
        {/* Location label — left-aligned */}
        <button
          onClick={handleBezirkClick}
          className="absolute left-4 flex items-center gap-1 text-white/80 text-xs hover:text-white transition-colors"
          aria-label="Bezirk auswählen"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            location_on
          </span>
          <span className="font-label">{bezirkLabel}</span>
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            arrow_drop_down
          </span>
        </button>

        {/* Center-aligned title — links to homepage */}
        <Link href="/" className="font-headline italic text-white text-xl hover:opacity-90 transition-opacity">
          {config.siteName}
        </Link>

        {/* Flag accent — right side */}
        <div className="absolute right-4 flex items-center gap-2">
          <div
            className="rounded-sm"
            style={{
              width: 20,
              height: 14,
              background: "linear-gradient(to bottom, #fff 50%, #2D5A27 50%)",
            }}
            aria-hidden="true"
          />
        </div>
      </header>
    </div>
  );
}
