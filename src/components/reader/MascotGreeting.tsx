"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";

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

export function MascotGreeting() {
  const slot = getTimeOfDay();
  const { greeting, quote } = GREETINGS[slot];

  return (
    <div className="flex items-start gap-4">
      {/* Sepp avatar — round mascot crop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/wurzelmann.png"
        alt="Sepp"
        className="w-16 h-16 rounded-full bg-ink-deep object-cover shrink-0"
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
          className="inline-flex items-center font-label text-label-md uppercase text-ink underline decoration-2 underline-offset-4"
        >
          Mein Bezirk wählen
        </button>
      </div>
    </div>
  );
}
