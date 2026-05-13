"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
    <div className="flex items-start gap-4">
      {/* Sepp avatar — full figure on parchment (no blend needed) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/wurzelmann.png"
        alt="Sepp"
        className="w-16 h-16 rounded-full object-contain shrink-0"
      />

      <div className="flex-1">
        <Eyebrow className="mb-1">Sepp sagt</Eyebrow>
        <p className="font-headline text-headline-md text-ink leading-snug mb-1">
          {greeting}!
        </p>
        <p className="font-label text-body-lg text-ink-muted mb-3">{quote}</p>

        <button
          type="button"
          onClick={openBezirkModal}
          className="inline-flex items-center font-label text-label-md uppercase text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-accent"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
