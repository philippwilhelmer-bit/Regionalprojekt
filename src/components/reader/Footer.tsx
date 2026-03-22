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
    <footer className="bg-zinc-100 border-t border-zinc-200 px-4 py-6 text-sm text-zinc-500">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <a
            href="/impressum"
            className="hover:text-zinc-700 underline underline-offset-2 transition-colors"
          >
            Impressum &amp; Datenschutz
          </a>
        </div>
        <div>
          <p className="font-medium text-zinc-600 mb-2">RSS-Feeds</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            <li>
              <a
                href="/rss/steiermark.xml"
                className="hover:text-zinc-700 transition-colors"
              >
                Steiermark (alle)
              </a>
            </li>
            {BEZIRK_SLUGS.map((slug) => (
              <li key={slug}>
                <a
                  href={`/rss/${slug}.xml`}
                  className="hover:text-zinc-700 transition-colors"
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
