"use client"

export function FragDenWurzelmannCard() {
  return (
    <div className="px-[var(--spacing-gutter)]">
      <button
        onClick={() => window.dispatchEvent(new Event('openBezirkModal'))}
        className="w-full text-left"
      >
        <p className="font-label uppercase text-xs font-semibold text-parchment/60 mb-1 tracking-wider">
          Dein Bezirk
        </p>
        <p className="font-headline text-xl font-semibold text-parchment leading-tight mb-2">
          Frag den Wurzelmann
        </p>
        <p className="font-label text-sm text-parchment/70">
          Waehle deinen Bezirk fuer hyperlokal gefilterte Nachrichten.
        </p>
      </button>
    </div>
  )
}
