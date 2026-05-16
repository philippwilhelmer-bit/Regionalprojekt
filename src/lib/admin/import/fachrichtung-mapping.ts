// GENERATED — do not edit manually. Source: fachrichtung-values.txt (51 entries).
// Re-generate via scripts/generate-fachrichtung-mapping.ts if the source changes.
import type { Fachrichtung } from '@prisma/client'

export const FACHRICHTUNG_LABELS: Record<Fachrichtung, string> = {
  ALLGEMEINMEDIZIN: 'Allgemeinmedizin',
  ALLGEMEINMEDIZIN_UND_FAMILIENMEDIZIN: 'Allgemeinmedizin und Familienmedizin',
  INNERE_MEDIZIN: 'Innere Medizin',
  FRAUENHEILKUNDE_UND_GEBURTSHILFE: 'Frauenheilkunde und Geburtshilfe',
  AUGENHEILKUNDE_UND_OPTOMETRIE: 'Augenheilkunde und Optometrie',
  ALLGEMEINCHIRURGIE_UND_VISZERALCHIRURGIE: 'Allgemeinchirurgie und Viszeralchirurgie',
  ORTHOPAEDIE_UND_TRAUMATOLOGIE: 'Orthopädie und Traumatologie',
  UNFALLCHIRURGIE: 'Unfallchirurgie',
  ORTHOPAEDIE_UND_ORTHOPAEDISCHE_CHIRURGIE: 'Orthopädie und Orthopädische Chirurgie',
  PSYCHIATRIE_U_PSYCHOTHERAPEUTISCHE_MEDIZIN: 'Psychiatrie u. Psychotherapeutische Medizin',
  HAUT_UND_GESCHLECHTSKRANKHEITEN: 'Haut- und Geschlechtskrankheiten',
  KINDER_UND_JUGENDHEILKUNDE: 'Kinder- und Jugendheilkunde',
  HALS_NASEN_UND_OHRENHEILKUNDE: 'Hals-, Nasen- und Ohrenheilkunde',
  NEUROLOGIE: 'Neurologie',
  RADIOLOGIE: 'Radiologie',
  UROLOGIE: 'Urologie',
  ANAESTHESIOLOGIE_UND_INTENSIVMEDIZIN: 'Anästhesiologie und Intensivmedizin',
  PLASTISCHE_REKONSTRUKTIVE_U_AESTHETISCHE_CHIRURGIE:
    'Plastische, Rekonstruktive u. Ästhetische Chirurgie',
  INNERE_MEDIZIN_UND_KARDIOLOGIE: 'Innere Medizin und Kardiologie',
  LUNGENKRANKHEITEN: 'Lungenkrankheiten',
  PSYCHIATRIE_UND_NEUROLOGIE: 'Psychiatrie und Neurologie',
  MUND_KIEFER_UND_GESICHTSCHIRURGIE: 'Mund-, Kiefer- und Gesichtschirurgie',
  NEUROLOGIE_UND_PSYCHIATRIE: 'Neurologie und Psychiatrie',
  NEUROCHIRURGIE: 'Neurochirurgie',
  KINDER_U_JUGENDPSYCHIATRIE_U_PSYCHOTHERAPEUTISCHE_MEDIZIN:
    'Kinder- u. Jugendpsychiatrie u. Psychotherapeutische Medizin',
  APPROBIERTER_ARZT: 'Approbierter Arzt',
  MEDIZINISCHE_UND_CHEMISCHE_LABORDIAGNOSTIK: 'Medizinische und Chemische Labordiagnostik',
  PHYSIKALISCHE_MEDIZIN_U_ALLGEMEINE_REHABILITATION:
    'Physikalische Medizin u. Allgemeine Rehabilitation',
  PSYCHIATRIE: 'Psychiatrie',
  ALLGEMEINCHIRURGIE_UND_GEFAESSCHIRURGIE: 'Allgemeinchirurgie und Gefäßchirurgie',
  INNERE_MEDIZIN_UND_PNEUMOLOGIE: 'Innere Medizin und Pneumologie',
  NUKLEARMEDIZIN: 'Nuklearmedizin',
  KINDER_UND_JUGENDPSYCHIATRIE: 'Kinder- und Jugendpsychiatrie',
  KLINISCHE_PATHOLOGIE_UND_MOLEKULARPATHOLOGIE: 'Klinische Pathologie und Molekularpathologie',
  KINDER_UND_JUGENDCHIRURGIE: 'Kinder- und Jugendchirurgie',
  HERZCHIRURGIE: 'Herzchirurgie',
  INNERE_MEDIZIN_UND_GASTROENTEROLOGIE_UND_HEPATOLOGIE:
    'Innere Medizin und Gastroenterologie und Hepatologie',
  KLINISCHE_MIKROBIOLOGIE_UND_HYGIENE: 'Klinische Mikrobiologie und Hygiene',
  STRAHLENTHERAPIE_RADIOONKOLOGIE: 'Strahlentherapie-Radioonkologie',
  ANATOMIE: 'Anatomie',
  KLINISCHE_IMMUNOLOGIE: 'Klinische Immunologie',
  THORAXCHIRURGIE: 'Thoraxchirurgie',
  ARBEITSMEDIZIN: 'Arbeitsmedizin',
  GERICHTSMEDIZIN: 'Gerichtsmedizin',
  INNERE_MEDIZIN_UND_ANGIOLOGIE: 'Innere Medizin und Angiologie',
  INNERE_MEDIZIN_UND_ENDOKRINOLOGIE_U_DIABETOLOGIE:
    'Innere Medizin und Endokrinologie u. Diabetologie',
  INNERE_MEDIZIN_UND_HAEMATOLOGIE_UND_INTERNISTISCHE_ONKOLOGIE:
    'Innere Medizin und Hämatologie und internistische Onkologie',
  INNERE_MEDIZIN_UND_INFEKTIOLOGIE: 'Innere Medizin und Infektiologie',
  INNERE_MEDIZIN_UND_INTENSIVMEDIZIN: 'Innere Medizin und Intensivmedizin',
  INNERE_MEDIZIN_UND_NEPHROLOGIE: 'Innere Medizin und Nephrologie',
  MEDIZINISCHE_GENETIK: 'Medizinische Genetik',
}

// Reverse-lookup for CSV import: German label → enum value
export const FACHRICHTUNG_BY_LABEL: Record<string, Fachrichtung> = Object.fromEntries(
  Object.entries(FACHRICHTUNG_LABELS).map(([k, v]) => [v, k as Fachrichtung]),
)

// Sorted list for the public datalist UI (D-25)
export const FACHRICHTUNG_OPTIONS: Array<{ id: Fachrichtung; label: string }> = Object.entries(
  FACHRICHTUNG_LABELS,
)
  .map(([id, label]) => ({ id: id as Fachrichtung, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'de'))
