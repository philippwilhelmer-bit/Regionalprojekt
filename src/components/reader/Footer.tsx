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
    <footer className="bg-surface px-4 pt-6 pb-24 text-sm text-ink-muted">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <a
            href="/impressum"
            className="hover:text-ink underline underline-offset-2 transition-colors"
          >
            Impressum &amp; Datenschutz
          </a>
        </div>
        <div>
          <p className="font-medium text-ink-soft mb-2">RSS-Feeds</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            <li>
              <a
                href="/rss/steiermark.xml"
                className="hover:text-ink transition-colors"
              >
                Steiermark (alle)
              </a>
            </li>
            {BEZIRK_SLUGS.map((slug) => (
              <li key={slug}>
                <a
                  href={`/rss/${slug}.xml`}
                  className="hover:text-ink transition-colors"
                >
                  {slug}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
