import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Impressum & Datenschutz',
}

/**
 * Impressum + Datenschutzerklärung page.
 *
 * Required by Austrian Mediengesetz §25 + ECG §5 + DSGVO.
 * No ads on this page (locked decision from CONTEXT.md).
 * The id="datenschutz" anchor is linked to from the CookieBanner.
 */
export default function ImpressumPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 prose prose-zinc">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 no-underline">← Zur Startseite</Link>
      {/* ------------------------------------------------------------------ */}
      {/* 1. Impressum (MedienG §25 + ECG §5)                                 */}
      {/* ------------------------------------------------------------------ */}
      <h1>Impressum</h1>

      <p>
        Angaben gemäß §25 Mediengesetz und §5 E-Commerce-Gesetz (ECG):
      </p>

      <h2>Medieninhaber &amp; Herausgeber</h2>
      <address>
        <strong>[MEDIENINHABER_NAME]</strong><br />
        [STRASSE]<br />
        [PLZ] [ORT], Österreich
      </address>

      <p>
        <strong>E-Mail:</strong> <a href="mailto:[EMAIL]">[EMAIL]</a><br />
        <strong>Telefon:</strong> [TELEFON]
      </p>

      <p>
        <strong>Unternehmensgegenstand:</strong> [UNTERNEHMENSGEGENSTAND]
      </p>

      <h2>Blattlinie (§25 Abs. 4 MedienG)</h2>
      <p>[BLATTLINIE]</p>

      <h2>Haftungsausschluss</h2>
      <p>
        Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die
        Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich
        deren Betreiber verantwortlich. Wir distanzieren uns hiermit ausdrücklich von
        allen Inhalten, die möglicherweise straf- oder haftungsrechtlich relevant sind
        oder gegen geltende Normen verstoßen.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* 2. KI-generierte Inhalte                                            */}
      {/* ------------------------------------------------------------------ */}
      <h2>Automatisch erstellte Inhalte</h2>
      <p>
        Teile dieser Website werden automatisch durch KI-Systeme erstellt. Automatisch
        generierte Artikel sind mit dem Hinweis &bdquo;Automatisch erstellt&ldquo;
        gekennzeichnet. Artikel, die Erwähnungen von Personen enthalten, werden vor der
        Veröffentlichung redaktionell geprüft.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Datenschutzerklärung (DSGVO) — id="datenschutz" for CookieBanner */}
      {/* ------------------------------------------------------------------ */}
      <h1 id="datenschutz">Datenschutzerklärung</h1>

      <h2>Cookies &amp; lokale Speicherung</h2>
      <p>
        Diese Website verwendet <code>localStorage</code> zur Speicherung Ihrer
        Bezirk-Auswahl sowie Ihrer Cookie-Einstellung. Es werden keine Tracking-Cookies
        ohne Ihre Zustimmung gesetzt.
      </p>

      <h2>Google AdSense</h2>
      <p>
        Wir verwenden Google AdSense zur Einblendung von Werbung. Bei Zustimmung werden
        personalisierte Anzeigen ausgeliefert; bei Ablehnung werden nicht-personalisierte
        Anzeigen gezeigt (NPA-Modus). Weitere Informationen:{' '}
        <a
          href="https://policies.google.com/technologies/ads"
          target="_blank"
          rel="noreferrer noopener"
        >
          https://policies.google.com/technologies/ads
        </a>
      </p>

      <h2>Keine Benutzerregistrierung</h2>
      <p>
        Diese Website erfordert keine Benutzerregistrierung. Es werden keine
        personenbezogenen Daten erhoben.
      </p>

      <h2>Kontakt Datenschutz</h2>
      <p>
        Bei Fragen zum Datenschutz wenden Sie sich an:{' '}
        <a href="mailto:[DATENSCHUTZ_EMAIL]">[DATENSCHUTZ_EMAIL]</a>
      </p>
    </div>
  )
}
