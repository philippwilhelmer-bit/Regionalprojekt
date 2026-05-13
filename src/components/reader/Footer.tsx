import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { Eyebrow } from "@/components/ui/Eyebrow";

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
    <footer className="bg-ink-deep text-on-primary px-[var(--spacing-gutter)] pt-[var(--spacing-void-md)] pb-28">
      <div className="max-w-3xl mx-auto">
        {/* Wordmark + tagline */}
        <Heading variant="display-sm" tone="on-dark" className="italic mb-2">
          Loden &amp; Leute
        </Heading>
        <p className="font-label text-body-lg text-on-primary/60 mb-10">
          Nachrichten aus der Steiermark
        </p>

        {/* Navigation columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          <div>
            <Eyebrow as="h3" tone="on-dark" className="mb-3">Rubriken</Eyebrow>
            <ul className="space-y-2 text-sm text-on-primary/80 [&_a]:transition-colors [&_a:hover]:text-accent">
              <li><Link href="/">Startseite</Link></li>
              <li><Link href="/suche">Bibliothek</Link></li>
            </ul>
          </div>

          <div>
            <Eyebrow as="h3" tone="on-dark" className="mb-3">RSS-Feeds</Eyebrow>
            <ul className="space-y-2 text-sm text-on-primary/80 [&_a]:transition-colors [&_a:hover]:text-accent">
              <li><a href="/rss/steiermark.xml">Steiermark (alle)</a></li>
              {BEZIRK_SLUGS.slice(0, 4).map(slug => (
                <li key={slug}><a href={`/rss/${slug}.xml`}>{slug}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <Eyebrow as="h3" tone="on-dark" className="mb-3">Rechtliches</Eyebrow>
            <ul className="space-y-2 text-sm text-on-primary/80 [&_a]:transition-colors [&_a:hover]:text-accent">
              <li><Link href="/impressum">Impressum</Link></li>
              <li><Link href="/impressum#kontakt">Kontakt</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright — separated by spacing, no border per design.md */}
        <div className="text-xs text-on-primary/40">
          &copy; {new Date().getFullYear()} Loden &amp; Leute
        </div>
      </div>
    </footer>
  );
}
