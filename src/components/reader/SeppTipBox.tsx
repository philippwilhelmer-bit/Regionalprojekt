import Link from "next/link";
import { Heading } from "@/components/ui/Heading";

interface SeppTipBoxProps {
  /** Italic quote body — falls back to a generic Sepp message. */
  quote?: string;
  /** Link label — falls back to "Mehr aus dem Archiv". */
  linkLabel?: string;
  /** Link href — falls back to /suche. */
  linkHref?: string;
}

const DEFAULT_QUOTE =
  "Bezirksgeschichten passieren überall in der Steiermark — wenn du mehr willst, " +
  "lies dich durchs Archiv. Ich hab dort noch Geschichten versteckt.";

export function SeppTipBox({
  quote = DEFAULT_QUOTE,
  linkLabel = "Mehr aus dem Archiv",
  linkHref = "/suche",
}: SeppTipBoxProps) {
  return (
    <div className="relative mt-[var(--spacing-void-md)] bg-parchment-dim p-8 md:p-12 overflow-hidden">
      {/* Decorative blur blob top-right */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-32 h-32 bg-accent/5 -mr-16 -mt-16 rounded-full blur-3xl"
      />

      <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {/* Sepp avatar — ring + bg-primary backdrop */}
        <div className="w-24 h-24 shrink-0 rounded-full bg-primary p-1 ring-4 ring-surface shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/wurzelmann%20freigestellt.png"
            alt="Sepp"
            className="w-full h-full object-cover [clip-path:circle(38%)]"
          />
        </div>

        <div className="flex-1">
          <Heading variant="headline-md" as="h3" className="mb-2">
            Sepp meint …
          </Heading>
          <p className="font-body text-base md:text-lg italic leading-relaxed text-ink-muted mb-6">
            {quote}
          </p>
          <Link
            href={linkHref}
            className="font-label text-label-md uppercase text-accent border-b-2 border-accent/40 pb-1 transition-colors hover:border-accent inline-block"
          >
            {linkLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
