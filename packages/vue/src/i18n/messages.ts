/**
 * Text that Octarine writes itself. Labels, hints and errors are the app's own
 * text; these are only the words components add around them.
 */
export interface Messages {
  /** After the label of an optional field. */
  optional: string
  /** Read out for a required group, which can't use the `required` attribute. */
  required: string
  /** Above a form that marks required fields with `*`. */
  requiredNote: string
  /** Label of the icon in front of an error message. */
  error: string
  /** Button that empties an input. */
  clear: string
  /** A control that is checking or fetching something. */
  loading: string
  /** Describes the limit of a field with a counter. */
  maxLength: (max: number) => string
  charactersLeft: (count: number) => string
  charactersOver: (count: number) => string
}

const en: Messages = {
  optional: '(optional)',
  required: '(required)',
  requiredNote: 'Fields marked * are required.',
  error: 'Error:',
  clear: 'Clear',
  loading: 'Loading',
  maxLength: (max) => `You can enter up to ${max} characters.`,
  charactersLeft: (n) => (n === 1 ? '1 character left' : `${n} characters left`),
  charactersOver: (n) => (n === 1 ? '1 character too many' : `${n} characters too many`),
}

const nl: Messages = {
  optional: '(optioneel)',
  required: '(verplicht)',
  requiredNote: 'Velden met * zijn verplicht.',
  error: 'Fout:',
  clear: 'Wissen',
  loading: 'Bezig met laden',
  maxLength: (max) => `Je kunt maximaal ${max} tekens invullen.`,
  charactersLeft: (n) => (n === 1 ? 'Nog 1 teken' : `Nog ${n} tekens`),
  charactersOver: (n) => (n === 1 ? '1 teken te veel' : `${n} tekens te veel`),
}

// French puts a (narrow no-break) space before ':'.
const fr: Messages = {
  optional: '(facultatif)',
  required: '(obligatoire)',
  requiredNote: 'Les champs marqués d’un * sont obligatoires.',
  error: 'Erreur :',
  clear: 'Effacer',
  loading: 'Chargement',
  maxLength: (max) => `Vous pouvez saisir jusqu’à ${max} caractères.`,
  charactersLeft: (n) => (n <= 1 ? `${n} caractère restant` : `${n} caractères restants`),
  charactersOver: (n) => (n <= 1 ? `${n} caractère en trop` : `${n} caractères en trop`),
}

const de: Messages = {
  optional: '(optional)',
  required: '(Pflichtfeld)',
  requiredNote: 'Mit * markierte Felder sind Pflichtfelder.',
  error: 'Fehler:',
  clear: 'Eingabe löschen',
  loading: 'Wird geladen',
  maxLength: (max) => `Sie können bis zu ${max} Zeichen eingeben.`,
  charactersLeft: (n) => `Noch ${n} Zeichen`,
  charactersOver: (n) => `${n} Zeichen zu viel`,
}

/** The languages Octarine ships, by primary language subtag. */
export const builtInMessages: Readonly<Record<string, Messages>> = { en, nl, fr, de }

export const fallbackLanguage = 'en'
