"use client";

import { useEffect, useState } from "react";
import type { BezirkItem } from "@/types/bundesland";
import { computeBezirkLabel } from "@/lib/bezirk-label";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const GREETINGS = {
  morning: {
    greeting: "Guten Morgen",
    quote: "Frische Nachrichten aus deiner Region.",
  },
  afternoon: {
    greeting: "Guten Tag",
    quote: "Was gibt's Neues in deinem Bezirk?",
  },
  evening: {
    greeting: "Guten Abend",
    quote: "Der Tag in deiner Region auf einen Blick.",
  },
};

function openBezirkModal() {
  window.dispatchEvent(new Event("openBezirkModal"));
}

interface MascotGreetingProps {
  bezirke: BezirkItem[];
}

export function MascotGreeting({ bezirke }: MascotGreetingProps) {
  const slot = getTimeOfDay();
  const { greeting, quote: defaultQuote } = GREETINGS[slot];

  const [bezirkLabel, setBezirkLabel] = useState<string | null>(null);

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

  const quote = bezirkLabel
    ? `Das gibt es Neues in ${bezirkLabel}.`
    : defaultQuote;
  const ctaLabel = bezirkLabel ? "Bezirk wechseln" : "Mein Bezirk wählen";

  return (
    <div className="flex flex-col items-start">
      {/* Sepp avatar — clipped to circle to hide baked-in checker corners */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/wurzelmann%20freigestellt.png"
        alt="Sepp"
        className="w-full aspect-square object-contain mb-6 self-stretch [clip-path:circle(38%)]"
      />

      <h2 className="font-headline tracking-tight text-headline-md text-primary mb-3">
        Sepp meint&hellip;
      </h2>

      <p className="font-headline italic text-body-lg text-ink-muted leading-relaxed mb-4">
        &laquo;{quote}&raquo;
      </p>

      <button
        type="button"
        onClick={openBezirkModal}
        className="inline-flex items-center gap-1 font-label text-label-md text-accent transition-colors hover:text-primary"
      >
        {ctaLabel}
        <span className="material-symbols-rounded text-[16px]" aria-hidden="true">arrow_right_alt</span>
      </button>
    </div>
  );
}
