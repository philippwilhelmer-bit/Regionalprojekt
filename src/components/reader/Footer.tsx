import Link from "next/link";

const BEZIRK_SLUGS = [
  "graz",
  "graz-umgebung",
  "liezen",
  "bruck-muerzzuschlag",
  "leoben",
  "murau",
  "murtal",
  "voitsberg",
  "deutschlandsberg",
  "weiz",
  "hartberg-fuerstenfeld",
  "suedoststeiermark",
  "leibnitz",
] as const;

export function Footer() {
  return (
    <footer className="bg-ink text-parchment px-[var(--spacing-gutter)] pt-12 pb-28">
      <div className="max-w-3xl mx-auto">
        {/* Brand mark */}
        <span className="font-headline italic text-parchment text-2xl block mb-6">Loden &amp; Leute</span>

        {/* Navigation columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1: Rubriken */}
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-parchment/60 mb-3">Rubriken</h3>
            <ul className="space-y-2 text-sm text-parchment/80">
              <li><Link href="/">Archiv</Link></li>
              <li><Link href="/suche">Bibliothek</Link></li>
            </ul>
          </div>

          {/* Column 2: RSS-Feeds */}
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-parchment/60 mb-3">RSS-Feeds</h3>
            <ul className="space-y-2 text-sm text-parchment/80">
              <li><a href="/rss/steiermark.xml">Steiermark (alle)</a></li>
              {/* Show first 4 Bezirk RSS links; remainder accessible via main RSS feed */}
              {BEZIRK_SLUGS.slice(0, 4).map(slug => (
                <li key={slug}><a href={`/rss/${slug}.xml`}>{slug}</a></li>
              ))}
            </ul>
          </div>

          {/* Column 3: Rechtliches */}
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-parchment/60 mb-3">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-parchment/80">
              <li><Link href="/impressum">Impressum</Link></li>
              <li><Link href="/impressum#kontakt">Kontakt</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright divider */}
        <div className="border-t border-parchment/10 pt-4 text-xs text-parchment/40">
          &copy; {new Date().getFullYear()} Loden &amp; Leute
        </div>
      </div>
    </footer>
  );
}
