# @octarine/i18n

Every text Octarine writes itself, one JSON file per language, and the formatter that fills them
in. That covers the components' words ("(optional)", "Clear", "There is a problem") and the forms'
error messages ("Please fill in this field."). Labels, hints and the form's own texts are the app's
and the form's.

It has no Vue and no DOM, so the components, the form engine and a server that writes errors all
use the same words.

## Languages

| File              | Language                   |
| ----------------- | -------------------------- |
| `locales/en.json` | English (built in)         |
| `locales/nl.json` | Dutch (Flemish, with "je") |
| `locales/fr.json` | French                     |
| `locales/de.json` | German                     |

English is always included. An app imports the other languages it uses, so the rest isn't
bundled:

```ts
import nl from '@octarine/i18n/locales/nl.json'

app.use(createMessages({ nl })) // the components (@octarine/vue)
createForms({ fields, messages: { nl } }) // the forms (@octarine/form-engine)
```

A language can also be loaded when the person picks it:
`const { default: fr } = await import('@octarine/i18n/locales/fr.json')`.

## Translating a language

1. Copy a file you can read (`en.json`, or `nl.json`, …) to `locales/<language>.json`, e.g.
   `it.json`.
2. Translate every value. Keep the keys, and keep each `{placeholder}` exactly as it is.
3. `locales/en.descriptions.json` says where each text appears and what its placeholders hold.

`pnpm test` checks every file: the same keys as English, the same placeholders, and an `other` form
in every plural. A language Octarine doesn't ship can also live in the app, as a file of the same
shape.

**Tone:** errors say how to fix the problem and ask politely ("Please enter…", "Gelieve … in te
vullen.", "Veuillez saisir…", "Bitte geben Sie … ein."). Examples use `name@example.com` and the
sample IBAN `BE68 5390 0754 7034`.

## Message format

Keys are flat: `field.optional`, `counter.charactersLeft`, `validation.required`.

| Written              | Means                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{max}`              | A parameter. Numbers are formatted for the language (`1.000` in Dutch).                                                                               |
| `{min:date}`         | A date, written out in full (`19 oktober 2026`). Given as `2026-10-19` or a `Date`.                                                                   |
| `{min:datetime}`     | A date and time.                                                                                                                                      |
| `{amount:number}`    | A number that arrives as text.                                                                                                                        |
| `{ "one", "other" }` | Plural forms, picked with `Intl.PluralRules` for the language. `"plural": "max"` names the parameter that decides; without it, the first number does. |

```json
"counter.charactersLeft": { "one": "{count} character left", "other": "{count} characters left" }
```

Use the forms the language needs (`zero`, `one`, `two`, `few`, `many`, `other`); German needs only
one text where English needs two, Polish more.

## Looking texts up

```ts
import { translate } from '@octarine/i18n'

translate([appCatalogs, builtInCatalogs], 'validation.maxLength', { max: 4 }, 'nl-BE')
```

`translate(sources, key, params, locale, { defaultLanguage })` asks each source in turn: catalogs
along the language chain (`nl-BE` → `nl` → `defaultLanguage` → `en`), a function with the requested
locale. It returns `undefined` when nobody knows the key. The components and the form engine build
their lookups on it.

| Export                                 | What it does                                      |
| -------------------------------------- | ------------------------------------------------- |
| `formatMessage(message, params, lang)` | Fills in one message.                             |
| `languageChain(locale, default?)`      | The languages to try, most specific first.        |
| `mergeCatalogs(...catalogs)`           | Catalogs combined per language; a later one wins. |
| `builtInCatalogs`, `fallbackLanguage`  | English, and `'en'`.                              |
| `isPluralMessage`, `placeholders`      | For tools and checks.                             |
| `Catalog`, `Catalogs`, `Message`, …    | The types.                                        |
