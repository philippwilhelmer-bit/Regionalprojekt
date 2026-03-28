"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import config from "@/../bundesland.config";
import type { BezirkItem } from "@/types/bundesland";
import { computeBezirkLabel } from "@/lib/bezirk-label";

interface WurzelAppBarProps {
  bezirke: BezirkItem[];
}

export function WurzelAppBar({ bezirke }: WurzelAppBarProps) {
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
    <header className="sticky top-0 z-40 bg-primary h-14 flex items-center justify-center relative px-4">
      {/* Centered brand: avatar + title */}
      <Link
        href="/"
        className="flex items-center gap-2 hover:opacity-90 transition-opacity"
        aria-label={`${config.siteName} — zur Startseite`}
      >
        <Image
          src="/images/wurzelmann.png"
          alt="Wurzelmann Maskottchen"
          width={32}
          height={32}
          className="rounded-full ring-2 ring-white/30"
        />
        <span className="font-headline uppercase font-bold text-white text-xl tracking-wide">
          {config.siteName}
        </span>
      </Link>

      {/* Bezirk selector — right */}
      <button
        onClick={handleBezirkClick}
        className="absolute right-4 flex items-center gap-1 text-white/80 text-xs font-label hover:text-white transition-colors"
        aria-label="Bezirk auswählen"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          location_on
        </span>
        <span>{bezirkLabel}</span>
      </button>
    </header>
  );
}
