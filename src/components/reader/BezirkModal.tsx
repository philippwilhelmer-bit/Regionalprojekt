"use client";

import { useEffect, useState } from "react";
import type { BezirkItem } from '@/types/bundesland';

const STORAGE_KEY = "bezirk_selection";

export function BezirkModal({ bezirke }: { bezirke: BezirkItem[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasPriorSelection, setHasPriorSelection] = useState(false);

  useEffect(() => {
    // Read existing selection from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        // No prior selection — auto-open on first visit
        setOpen(true);
        setHasPriorSelection(false);
      } else {
        const slugs: string[] = JSON.parse(raw);
        if (Array.isArray(slugs)) {
          setSelected(new Set(slugs));
        }
        setHasPriorSelection(true);
      }
    } catch {
      setOpen(true);
    }

    // Listen for header trigger
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("openBezirkModal", handleOpen);
    return () => window.removeEventListener("openBezirkModal", handleOpen);
  }, []);

  function toggleBezirk(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === bezirke.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(bezirke.map((b) => b.slug)));
    }
  }

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
    } catch {
      // Ignore localStorage errors
    }
    setOpen(false);
    window.location.reload();
  }

  function handleDismiss() {
    if (!hasPriorSelection) {
      // Save empty array so modal does not re-open on next visit
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      } catch {
        // Ignore
      }
    }
    setOpen(false);
  }

  if (!open) return null;

  const allSelected = selected.size === bezirke.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Bezirk auswählen"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Mein Bezirk</h2>

        {/* "Alle Bezirke" toggle */}
        <button
          onClick={toggleAll}
          className={
            "w-full mb-4 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors " +
            (allSelected
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-blue-400")
          }
        >
          Alle Bezirke
        </button>

        {/* Chip grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
          {bezirke.map((bezirk) => {
            const isSelected = selected.has(bezirk.slug);
            return (
              <button
                key={bezirk.slug}
                onClick={() => toggleBezirk(bezirk.slug)}
                className={
                  "py-2 px-3 rounded-lg border-2 text-xs font-medium transition-colors text-left " +
                  (isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")
                }
              >
                {bezirk.name}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Übernehmen
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-2 px-4 rounded-xl text-zinc-500 text-sm hover:text-zinc-700 transition-colors"
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
