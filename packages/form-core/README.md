# @octarine/form-core

The rules of Octarine's JSON forms: validation, conditions, expressions, paths and lists. It has
no Vue and no DOM, so the same code checks a form in the browser (through
[`@octarine/form-engine`](../form-engine)) and on the server.

What the client checks only helps the person filling in the form; it can't be trusted. Whatever is
submitted is checked again on the server, against the form's definition, with this package. One
implementation means the two sides can't drift apart.

## Checking a submission

```ts
import { validateSubmission } from '@octarine/form-core'

const result = validateSubmission(definition, submittedModel, { env: { language: 'nl' } })

result.valid // false
result.errors
// [{ path: 'name', rule: 'minLength', key: 'formRenderer.validation.minLength', params: { min: 3 } }]
```

- Every rule in `definition.validations` runs, with `items.*.quantity` expanded against the
  submitted rows. Hidden fields are checked like any other.
- Errors are **message keys with parameters**, not text. The server can translate them, or send
  them back for the client to translate. A rule's own `message` (a localisation key of the form, or
  literal text) comes along as `message`.
- A field the model leaves out reads as `undefined` in expressions, as it does in the browser, so a
  required-if doesn't turn on because a key is missing. The model you pass in isn't changed.

Options:

| Option                | What it does                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| `validators`          | Validators to add to the built-in ones; one with the same name replaces it.      |
| `expressionLanguages` | Languages a form can name in `definition.expressions`, besides `js`.             |
| `functions`           | The functions expressions can call (default: `age()`).                           |
| `env`                 | Facts about where the form runs, available as `env` in expressions (`language`). |

Register custom validators and functions in a module that the app and the server both import: a
validator that exists only on the client lets anything through on the server.

### Behind an interface

`SubmissionValidator` (from [`@octarine/form-abstractions`](../form-abstractions)) is how the client
and the server ask for a check without knowing where it runs. `createLocalSubmissionValidator()`
runs it in-process; a remote one (calling the form service over HTTP) can replace it later without
changing the forms.

```ts
const validator = createLocalSubmissionValidator({ validators })
const result = await validator.validate(definition, model)
```

## What else is in it

| Export                                                  | What it does                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `FormValidator`                                         | A form's rules over a model you pass in: `validatePath`, `validateAll`, `isRequired`, `resolveCondition`. The engine uses it. |
| `registerValidator`, `skipWhenEmpty`, `isEmpty`         | The built-in validators' registry and helpers. See the form-engine README for writing one.                                    |
| `jsLanguage`, `ExpressionService`, `ExpressionError`    | The built-in `js` expression language, and condition resolving with its fallbacks.                                            |
| `getProperty`, `setProperty`, `resolvePathContext`, …   | Dot-paths into a model, and which segments are rows (`items.2.name` → `items.*.name`).                                        |
| `collectHideConditions`, `collectFields`, `findClosest` | What the definition says about a path: the `hide` conditions on the way to it, its field.                                     |
| `LocalisationService`, `ListService`                    | A form's own texts and lists.                                                                                                 |
| `defaultTranslationProvider`                            | English text for the built-in validators' keys.                                                                               |

## Rules for this package

- No Vue, no DOM: `src/core.spec.ts` checks that no source imports Vue or uses browser globals, and
  that the only dependencies are the abstractions and the expression parser. The specs run in Node.
- Nothing here holds reactive state. Functions read the model they are given; the engine passes its
  reactive model, so Vue tracks the reads.

```sh
pnpm --filter @octarine/form-core build   # dist/: index.js + types
pnpm --filter @octarine/form-core test
```
