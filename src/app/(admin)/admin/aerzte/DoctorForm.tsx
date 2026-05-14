import type { Bezirk } from '@prisma/client'
import type { DoctorWithBezirk } from '@/lib/content/doctors'

/**
 * Shared create/edit form for the Doctor admin (Phase 46 / DIR-06).
 *
 * Server Component (no client state). Bound to a Server Action via the
 * `formAction` prop — caller passes `createDoctorForm` or `updateDoctorForm`.
 *
 * Field set follows CONTEXT.md "Felder-Vollkatalog" + RESEARCH.md "Q1 MVP".
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

        {/* Kategorie */}
        <div>
          <label
            htmlFor="kategorie"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Kategorie <span className="text-dir-error">*</span>
          </label>
          <select
            id="kategorie"
            name="kategorie"
            required
            defaultValue={doctor?.kategorie ?? 'ALLGEMEINMEDIZIN'}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
          >
            <option value="ALLGEMEINMEDIZIN">Allgemeinmedizin</option>
            <option value="FACHARZT">Facharzt</option>
            <option value="ZAHNARZT">Zahnarzt</option>
          </select>
        </div>

        {/* Fachrichtung */}
        <div>
          <label
            htmlFor="fachrichtung"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Fachrichtung{' '}
            <span className="text-xs text-dir-on-surface-variant">
              (nur bei Facharzt)
            </span>
          </label>
          <input
            id="fachrichtung"
            name="fachrichtung"
            type="text"
            defaultValue={doctor?.fachrichtung ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="Orthopädie"
          />
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

        {/* Website */}
        <div>
          <label
            htmlFor="website"
            className="block text-sm font-medium text-dir-on-surface-variant mb-dir-xs"
          >
            Website{' '}
            <span className="text-xs text-dir-on-surface-variant">(optional)</span>
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={doctor?.website ?? ''}
            className="w-full border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
            placeholder="https://"
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
