import type { Bezirk } from '@prisma/client'
import type { DoctorWithBezirk } from '@/lib/content/doctors'

/**
 * Shared create/edit form for the Doctor admin (Phase 47 / DIR-06, updated from Phase 46).
 *
 * Updated from Phase 46: kategorie field removed (D-03). fachrichtung is now a required
 * <select> with all 51 Fachrichtung enum values (D-04). profilUrl replaces website (D-02).
 * arztNr (required, unique) added as a text input (D-01).
 *
 * Server Component (no client state). Bound to a Server Action via the
 * `formAction` prop — caller passes `createDoctorForm` or `updateDoctorForm`.
 *
 * Field set follows CONTEXT.md "Felder-Vollkatalog" + Phase 47 decisions.
 * When editing, defaults are pre-filled via `defaultValue` (uncontrolled).
 *
 * Missing-geo warning block surfaces when an existing doctor has lat=null
 * after a save — admin-visible signal that Nominatim or mapgen failed.
 */
interface DoctorFormProps {
  doctor?: DoctorWithBezirk
  bezirke: Bezirk[]
  formAction: (formData: FormData) => Promise<void>
  submitLabel: string
}

const FACHRICHTUNG_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALLGEMEINMEDIZIN', label: 'Allgemeinmedizin' },
  { value: 'ALLGEMEINMEDIZIN_UND_FAMILIENMEDIZIN', label: 'Allgemeinmedizin und Familienmedizin' },
  { value: 'INNERE_MEDIZIN', label: 'Innere Medizin' },
  { value: 'FRAUENHEILKUNDE_UND_GEBURTSHILFE', label: 'Frauenheilkunde und Geburtshilfe' },
  { value: 'AUGENHEILKUNDE_UND_OPTOMETRIE', label: 'Augenheilkunde und Optometrie' },
  { value: 'ALLGEMEINCHIRURGIE_UND_VISZERALCHIRURGIE', label: 'Allgemeinchirurgie und Viszeralchirurgie' },
  { value: 'ORTHOPAEDIE_UND_TRAUMATOLOGIE', label: 'Orthopädie und Traumatologie' },
  { value: 'UNFALLCHIRURGIE', label: 'Unfallchirurgie' },
  { value: 'ORTHOPAEDIE_UND_ORTHOPAEDISCHE_CHIRURGIE', label: 'Orthopädie und Orthopädische Chirurgie' },
  { value: 'PSYCHIATRIE_U_PSYCHOTHERAPEUTISCHE_MEDIZIN', label: 'Psychiatrie u. Psychotherapeutische Medizin' },
  { value: 'HAUT_UND_GESCHLECHTSKRANKHEITEN', label: 'Haut- und Geschlechtskrankheiten' },
  { value: 'KINDER_UND_JUGENDHEILKUNDE', label: 'Kinder- und Jugendheilkunde' },
  { value: 'HALS_NASEN_UND_OHRENHEILKUNDE', label: 'Hals-, Nasen- und Ohrenheilkunde' },
  { value: 'NEUROLOGIE', label: 'Neurologie' },
  { value: 'RADIOLOGIE', label: 'Radiologie' },
  { value: 'UROLOGIE', label: 'Urologie' },
  { value: 'ANAESTHESIOLOGIE_UND_INTENSIVMEDIZIN', label: 'Anästhesiologie und Intensivmedizin' },
  { value: 'PLASTISCHE_REKONSTRUKTIVE_U_AESTHETISCHE_CHIRURGIE', label: 'Plastische, Rekonstruktive u. Ästhetische Chirurgie' },
  { value: 'INNERE_MEDIZIN_UND_KARDIOLOGIE', label: 'Innere Medizin und Kardiologie' },
  { value: 'LUNGENKRANKHEITEN', label: 'Lungenkrankheiten' },
  { value: 'PSYCHIATRIE_UND_NEUROLOGIE', label: 'Psychiatrie und Neurologie' },
  { value: 'MUND_KIEFER_UND_GESICHTSCHIRURGIE', label: 'Mund-, Kiefer- und Gesichtschirurgie' },
  { value: 'NEUROLOGIE_UND_PSYCHIATRIE', label: 'Neurologie und Psychiatrie' },
  { value: 'NEUROCHIRURGIE', label: 'Neurochirurgie' },
  { value: 'KINDER_U_JUGENDPSYCHIATRIE_U_PSYCHOTHERAPEUTISCHE_MEDIZIN', label: 'Kinder- u. Jugendpsychiatrie u. Psychotherapeutische Medizin' },
  { value: 'APPROBIERTER_ARZT', label: 'Approbierter Arzt' },
  { value: 'MEDIZINISCHE_UND_CHEMISCHE_LABORDIAGNOSTIK', label: 'Medizinische und Chemische Labordiagnostik' },
  { value: 'PHYSIKALISCHE_MEDIZIN_U_ALLGEMEINE_REHABILITATION', label: 'Physikalische Medizin u. Allgemeine Rehabilitation' },
  { value: 'PSYCHIATRIE', label: 'Psychiatrie' },
  { value: 'ALLGEMEINCHIRURGIE_UND_GEFAESSCHIRURGIE', label: 'Allgemeinchirurgie und Gefäßchirurgie' },
  { value: 'INNERE_MEDIZIN_UND_PNEUMOLOGIE', label: 'Innere Medizin und Pneumologie' },
  { value: 'NUKLEARMEDIZIN', label: 'Nuklearmedizin' },
  { value: 'KINDER_UND_JUGENDPSYCHIATRIE', label: 'Kinder- und Jugendpsychiatrie' },
  { value: 'KLINISCHE_PATHOLOGIE_UND_MOLEKULARPATHOLOGIE', label: 'Klinische Pathologie und Molekularpathologie' },
  { value: 'KINDER_UND_JUGENDCHIRURGIE', label: 'Kinder- und Jugendchirurgie' },
  { value: 'HERZCHIRURGIE', label: 'Herzchirurgie' },
  { value: 'INNERE_MEDIZIN_UND_GASTROENTEROLOGIE_UND_HEPATOLOGIE', label: 'Innere Medizin und Gastroenterologie und Hepatologie' },
  { value: 'KLINISCHE_MIKROBIOLOGIE_UND_HYGIENE', label: 'Klinische Mikrobiologie und Hygiene' },
  { value: 'STRAHLENTHERAPIE_RADIOONKOLOGIE', label: 'Strahlentherapie-Radioonkologie' },
  { value: 'ANATOMIE', label: 'Anatomie' },
  { value: 'KLINISCHE_IMMUNOLOGIE', label: 'Klinische Immunologie' },
  { value: 'THORAXCHIRURGIE', label: 'Thoraxchirurgie' },
  { value: 'ARBEITSMEDIZIN', label: 'Arbeitsmedizin' },
  { value: 'GERICHTSMEDIZIN', label: 'Gerichtsmedizin' },
  { value: 'INNERE_MEDIZIN_UND_ANGIOLOGIE', label: 'Innere Medizin und Angiologie' },
  { value: 'INNERE_MEDIZIN_UND_ENDOKRINOLOGIE_U_DIABETOLOGIE', label: 'Innere Medizin und Endokrinologie u. Diabetologie' },
  { value: 'INNERE_MEDIZIN_UND_HAEMATOLOGIE_UND_INTERNISTISCHE_ONKOLOGIE', label: 'Innere Medizin und Hämatologie und internistische Onkologie' },
  { value: 'INNERE_MEDIZIN_UND_INFEKTIOLOGIE', label: 'Innere Medizin und Infektiologie' },
  { value: 'INNERE_MEDIZIN_UND_INTENSIVMEDIZIN', label: 'Innere Medizin und Intensivmedizin' },
  { value: 'INNERE_MEDIZIN_UND_NEPHROLOGIE', label: 'Innere Medizin und Nephrologie' },
  { value: 'MEDIZINISCHE_GENETIK', label: 'Medizinische Genetik' },
]

export default function DoctorForm({
  doctor,
  bezirke,
  formAction,
  submitLabel,
}: DoctorFormProps) {
  const showGeoWarning = doctor !== undefined && doctor.lat === null && doctor.address

  return (
    <>
      {showGeoWarning && (
        <div className="bg-dir-error-container text-dir-on-error-container rounded-dir-md p-dir-md mb-dir-md text-sm">
          ⚠ Adresse konnte nicht geokodiert werden. Eintrag wurde gespeichert,
          aber ohne Kartenpin. Adresse korrigieren und erneut speichern, um die
          Geokodierung neu zu versuchen.
        </div>
      )}

      <form
        action={formAction}
        className="bg-dir-surface-container-lowest rounded-dir-md p-dir-md space-y-dir-md"
      >
        {doctor && <input type="hidden" name="id" value={doctor.id} />}

        {/* ArztNr */}
        <div>
          <label
            htmlFor="arztNr"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            ArztNr <span className="text-dir-error">*</span>
          </label>
          <input
            id="arztNr"
            name="arztNr"
            type="text"
            required
            defaultValue={doctor?.arztNr ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="A1234"
          />
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Name <span className="text-dir-error">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={doctor?.name ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="Maria Müller"
          />
        </div>

        {/* Titel */}
        <div>
          <label
            htmlFor="titel"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Titel{' '}
            <span className="text-xs text-dir-on-surface-variant">
              (optional, z.&nbsp;B. „Univ.-Doz. Dr.")
            </span>
          </label>
          <input
            id="titel"
            name="titel"
            type="text"
            defaultValue={doctor?.titel ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="Dr."
          />
        </div>

        {/* Fachrichtung */}
        <div>
          <label
            htmlFor="fachrichtung"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Fachrichtung <span className="text-dir-error">*</span>
          </label>
          <select
            id="fachrichtung"
            name="fachrichtung"
            required
            defaultValue={doctor?.fachrichtung ?? 'ALLGEMEINMEDIZIN'}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
          >
            {FACHRICHTUNG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Adresse */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Adresse <span className="text-dir-error">*</span>
          </label>
          <input
            id="address"
            name="address"
            type="text"
            required
            defaultValue={doctor?.address ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="Herrengasse 16, 8010 Graz"
          />
        </div>

        {/* Bezirk */}
        <div>
          <label
            htmlFor="bezirkId"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Bezirk <span className="text-dir-error">*</span>
          </label>
          <select
            id="bezirkId"
            name="bezirkId"
            required
            defaultValue={doctor?.bezirkId ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {bezirke.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            E-Mail{' '}
            <span className="text-xs text-dir-on-surface-variant">(optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={doctor?.email ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
          />
        </div>

        {/* Profil-URL (Ärztekammer) */}
        <div>
          <label
            htmlFor="profilUrl"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Profil-URL (Ärztekammer){' '}
            <span className="text-xs text-dir-on-surface-variant">(optional)</span>
          </label>
          <input
            id="profilUrl"
            name="profilUrl"
            type="url"
            defaultValue={doctor?.profilUrl ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="https://www.aekstmk.or.at/aerztesuche-46?arztnr=…"
          />
        </div>

        {/* Telefon */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Telefon{' '}
            <span className="text-xs text-dir-on-surface-variant">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={doctor?.phone ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
          />
        </div>

        {/* Editorial Note */}
        <div>
          <label
            htmlFor="editorialNote"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Redaktionelle Notiz{' '}
            <span className="text-xs text-dir-on-surface-variant">(optional)</span>
          </label>
          <textarea
            id="editorialNote"
            name="editorialNote"
            rows={5}
            defaultValue={doctor?.editorialNote ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="Markdown-flavored, paragraphs separated by blank lines"
          />
        </div>

        {/* Related article IDs */}
        <div>
          <label
            htmlFor="relatedArticleIds"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Verwandte Artikel{' '}
            <span className="text-xs text-dir-on-surface-variant">
              (kommaseparierte publicIds, optional)
            </span>
          </label>
          <input
            id="relatedArticleIds"
            name="relatedArticleIds"
            type="text"
            defaultValue={doctor?.relatedArticleIds.join(', ') ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="abc123, def456"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-dir-sm pt-dir-sm">
          <button
            type="submit"
            className="px-dir-md py-dir-sm bg-dir-primary text-dir-on-primary text-sm font-medium rounded-dir-sm hover:opacity-90"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </>
  )
}
