"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import config from "@/../bundesland.config";
import type { BezirkItem } from "@/types/bundesland";
import { computeBezirkLabel } from "@/lib/bezirk-label";

interface WurzelAppBarProps {
  bezirke: BezirkItem[];
}

export function WurzelAppBar({ bezirke }: WurzelAppBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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
    } catch { /* Ignore localStorage errors */ }
  }, [bezirke]);

  function handleBezirkClick() {
    window.dispatchEvent(new CustomEvent("openBezirkModal"));
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Styrian flag stripe — preserved per Phase 33 decision */}
      <div
        className="w-full h-[4px]"
        style={{ background: 'linear-gradient(to bottom, #fff 50%, #2D5A27 50%)' }}
        aria-hidden="true"
      />

      <div className="bg-ink px-4 h-14 flex items-center justify-between">
        {/* Left: serif brand name */}
        <Link href="/" className="font-headline italic text-parchment text-xl">
          Wurzelwelt
        </Link>

        {/* Mobile: hamburger button — hidden on md+ */}
        <button
          className="md:hidden text-parchment p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
        >
          <span className="material-symbols-rounded text-2xl" aria-hidden="true">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>

        {/* Desktop: nav links — hidden below md */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-parchment/80">
          <Link href="/" className="hover:text-parchment transition-colors">Archiv</Link>
          <Link href="/" className="hover:text-parchment transition-colors opacity-40 cursor-default">Wald</Link>
          <Link href="/" className="hover:text-parchment transition-colors opacity-40 cursor-default">Ratgeber</Link>
          <Link href="/suche" className="hover:text-parchment transition-colors">Bibliothek</Link>
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <nav className="md:hidden bg-ink-soft px-4 py-4 flex flex-col gap-3 text-parchment text-sm">
          <Link href="/" onClick={() => setMenuOpen(false)}>Archiv</Link>
          <span className="opacity-40">Wald (bald verfügbar)</span>
          <span className="opacity-40">Ratgeber (bald verfügbar)</span>
          <Link href="/suche" onClick={() => setMenuOpen(false)}>Bibliothek</Link>
          {/* Bezirk selector in drawer */}
          <button
            onClick={handleBezirkClick}
            className="flex items-center gap-1 text-parchment/80 text-sm mt-2 pt-2 border-t border-parchment/10"
          >
            <span className="material-symbols-rounded text-[16px]" aria-hidden="true">location_on</span>
            <span>{bezirkLabel}</span>
          </button>
        </nav>
      )}
    </header>
  );
}
