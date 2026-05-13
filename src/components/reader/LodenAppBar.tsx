"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BezirkItem } from "@/types/bundesland";
import { computeBezirkLabel } from "@/lib/bezirk-label";

interface LodenAppBarProps {
  bezirke: BezirkItem[];
}

export function LodenAppBar({ bezirke }: LodenAppBarProps) {
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
        style={{ background: 'linear-gradient(to bottom, #fff 50%, var(--color-secondary) 50%)' }}
        aria-hidden="true"
      />

      <div className="bg-background px-4 h-14 flex items-center justify-between border-b border-outline-variant/30">
        {/* Left: serif uppercase wordmark */}
        <Link href="/" className="flex items-center transition-colors hover:text-accent">
          <span className="font-headline uppercase tracking-[0.22em] text-primary text-base font-semibold">
            Loden &amp; Leute
          </span>
        </Link>

        {/* Mobile: search icon + hamburger — hidden on md+ */}
        <div className="md:hidden flex items-center gap-1">
          <Link
            href="/suche"
            className="text-primary p-1 transition-colors hover:text-accent"
            aria-label="Suche"
          >
            <span className="material-symbols-rounded text-2xl" aria-hidden="true">search</span>
          </Link>
          <button
            className="text-primary p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          >
            <span className="material-symbols-rounded text-2xl" aria-hidden="true">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* Desktop: nav links + bezirk selector + search — hidden below md */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-primary/80">
          <Link href="/" className="hover:text-accent transition-colors">Startseite</Link>
          <Link href="/suche" className="hover:text-accent transition-colors">Bibliothek</Link>
          <button
            onClick={handleBezirkClick}
            className="flex items-center gap-1 hover:text-accent transition-colors"
            aria-label="Bezirk auswählen"
          >
            <span className="material-symbols-rounded text-[16px]" aria-hidden="true">location_on</span>
            <span className="font-label">{bezirkLabel}</span>
            <span className="material-symbols-rounded text-[14px]" aria-hidden="true">arrow_drop_down</span>
          </button>
          <Link
            href="/suche"
            className="text-primary transition-colors hover:text-accent"
            aria-label="Suche"
          >
            <span className="material-symbols-rounded text-xl" aria-hidden="true">search</span>
          </Link>
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <nav className="md:hidden bg-background px-4 py-4 flex flex-col gap-3 text-primary text-sm border-b border-outline-variant/30">
          <Link href="/" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-accent">Startseite</Link>
          <Link href="/suche" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-accent">Bibliothek</Link>
          {/* Bezirk selector in drawer */}
          <button
            onClick={handleBezirkClick}
            className="flex items-center gap-1 text-primary/80 text-sm mt-2 pt-2 border-t border-outline-variant/30 transition-colors hover:text-accent"
          >
            <span className="material-symbols-rounded text-[16px]" aria-hidden="true">location_on</span>
            <span>{bezirkLabel}</span>
          </button>
        </nav>
      )}
    </header>
  );
}
