"use client";

import Image from "next/image";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const GREETINGS = {
  morning: {
    greeting: "Guten Morgen",
    quote: "Frische Nachrichten aus deiner Region!",
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

export function MascotGreeting() {
  const slot = getTimeOfDay();
  const { greeting, quote } = GREETINGS[slot];

  return (
    <div className="px-[var(--spacing-gutter)] py-4">
      {/* Speech bubble + avatar wrapper */}
      <div className="flex flex-col items-start">
        {/* Bubble container */}
        <div className="relative w-full">
          {/* "Wurzelmann sagt:" label */}
          <p className="font-label uppercase text-xs font-semibold text-primary mb-1 tracking-wider">
            Wurzelmann sagt:
          </p>

          {/* Speech bubble */}
          <div className="bg-surface-elevated rounded-sm shadow-sm p-3 relative">
            <p className="font-headline text-base font-semibold text-zinc-900 leading-snug">
              {greeting}!
            </p>
            <p className="font-label text-sm text-zinc-600 mt-0.5">{quote}</p>

            {/* Triangular tail pointing down-left toward avatar */}
            <span
              className="absolute -bottom-[10px] left-6"
              style={{
                width: 0,
                height: 0,
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "10px solid white",
              }}
            />
          </div>
        </div>

        {/* Wurzelmann avatar — placed below and slightly left of bubble */}
        <div className="ml-2 mt-0.5">
          <Image
            src="/images/wurzelmann.png"
            alt="Wurzelmann"
            width={180}
            height={180}
            className="object-contain"
            priority={false}
          />
        </div>
      </div>
    </div>
  );
}
