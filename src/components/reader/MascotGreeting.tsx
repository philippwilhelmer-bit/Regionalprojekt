"use client";

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
    <div className="px-[var(--spacing-gutter)]">
      <div className="bg-surface rounded-xs px-4 py-3">
        <p className="font-label uppercase text-xs font-semibold text-ink-muted mb-1 tracking-wider">
          Sepp sagt ...
        </p>
        <p className="font-headline text-base font-semibold text-ink leading-snug">
          {greeting}!
        </p>
        <p className="font-label text-sm text-ink/60 mt-0.5">{quote}</p>
      </div>
    </div>
  );
}
