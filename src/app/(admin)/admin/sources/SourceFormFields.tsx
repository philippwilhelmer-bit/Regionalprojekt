const OTS_CATEGORIES = [
  { value: '', label: 'Keine (alle Themen)' },
  { value: 'politik', label: 'Politik' },
  { value: 'wirtschaft', label: 'Wirtschaft' },
  { value: 'kultur', label: 'Kultur' },
  { value: 'medien', label: 'Medien' },
  { value: 'chronik', label: 'Chronik' },
  { value: 'sport', label: 'Sport' },
] as const

interface SourceFormFieldsProps {
  category?: string | null
  keywords?: string[]
}

export function SourceFormFields({ category, keywords }: SourceFormFieldsProps) {
  return (
    <>
      {/* OTS Kategorie */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-text/70 mb-1">
          OTS-Kategorie <span className="text-xs text-text/50">(optional)</span>
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category ?? ''}
          className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {OTS_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <p className="text-xs text-text/50 mt-1">
          Filtert den OTS-Feed nach Themenbereich
        </p>
      </div>

      {/* Stichwörter */}
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-text/70 mb-1">
          Stichwörter <span className="text-xs text-text/50">(optional, kommagetrennt)</span>
        </label>
        <input
          id="keywords"
          name="keywords"
          type="text"
          defaultValue={(keywords ?? []).join(', ')}
          className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Steiermark, Graz, Ennstal..."
        />
        <p className="text-xs text-text/50 mt-1">
          Nur Artikel mit mindestens einem Stichwort werden übernommen. Leer = alle Artikel.
        </p>
      </div>
    </>
  )
}
