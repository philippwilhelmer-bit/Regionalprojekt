"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";

export function FragDenSeppCard() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("openBezirkModal"))}
      className="w-full text-left flex items-start gap-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/wurzelmann.png"
        alt="Sepp"
        className="w-16 h-16 rounded-full bg-ink object-cover shrink-0"
      />
      <div className="flex-1">
        <Eyebrow tone="on-dark" className="mb-1">
          Dein Bezirk
        </Eyebrow>
        <Heading variant="headline-md" tone="on-dark" className="mb-2">
          Frag den Sepp
        </Heading>
        <p className="font-label text-body-lg text-on-primary/70 mb-3">
          Wähle deinen Bezirk für hyperlokal gefilterte Nachrichten.
        </p>
        <span className="inline-flex items-center font-label text-label-md uppercase text-on-primary underline decoration-2 underline-offset-4">
          Jetzt auswählen
        </span>
      </div>
    </button>
  );
}
