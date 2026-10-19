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

const result = await validateSubmission(definition, submittedModel, { env: { language: 'nl' } })

result.valid // false
result.errors
// [{ path: 'name', rule: 'minLength', key: 'validation.minLength', params: { min: 3 } }]
```

- Every rule in `definition.validations` runs, with `items.*.quantity` expanded against the
  submitted rows. Hidden fields are checked like any other.
- Errors are **message keys with parameters**, not text. The server can translate them, or send
  them back for the client to translate. A rule's own `message` (a key of the form's texts, or
  literal text) comes along as `message`. A date outside its bounds says which bound
  (`validation.dateMin`, `dateMax`, `dateRange`), with the bounds as parameters.
- Async validators (a promise) are waited for. One that rejects or throws fails closed, with
  `validation.unavailable`.
- A field the model leaves out reads as `undefined` in expressions, as it does in the browser, so a
  required-if doesn't turn on because a key is missing. The model you pass in isn't changed.

Options:

| Option                | What it does                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| `validators`          | Validators to add to the built-in ones; one with the same name replaces it.      |
| `repeatTypes`         | Field types with rows besides `repeat`, so their row fields are known.           |
| `expressionLanguages` | Languages a form can name in `definition.expressions`, besides `js`.             |
| `functions`           | Functions expressions can call, besides `age()`.                                 |
| `env`                 | Facts about where the form runs, available as `env` in expressions (`language`). |

Register custom validators and functions in a module that the app and the server both import: a
validator that exists only on the client lets anything through on the server.

### Errors in words

A server that answers with text instead of keys puts the errors into words with `translateErrors`.
It looks texts up the way the browser does: a rule's own `message` in the form's `localisations`,
then the app's `messages` and `translate`, then Octarine's English, along the language chain
(`nl-BE` → `nl` → the form's default → `en`).

```ts
import nl from '@octarine/i18n/locales/nl.json'

const { errors } = await validateSubmission(definition, model, rules)
translateErrors(errors, definition, 'nl-BE', { messages: { nl } })
// [{ path: 'name', rule: 'required', key: 'validation.required', text: 'Gelieve dit veld in te vullen.' }]
```

A rule's `message` that is a choice by condition is chosen by `validateSubmission`, against the
submitted model, so its errors carry a plain key.

### Rules only the server can check

`delegateToServer(submissionValidator)` is a validator for the client that leaves its rule to the
server: register it under the rule's type on the client, and the real validator under the same
type on the server. See the form-engine README.

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

| Export                                                             | What it does                                                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `FormValidator`                                                    | A form's rules over a model you pass in: `validatePath`, `validateAll`, `isRequired`, `resolveCondition`. The engine uses it. |
| `builtInValidators`, `defineValidator`, `skipWhenEmpty`, `isEmpty` | The validators every form has, and helpers for writing your own (see the form-engine README).                                 |
| `jsLanguage`, `ExpressionService`, `ExpressionError`               | The built-in `js` expression language, and condition resolving with its fallbacks.                                            |
| `getProperty`, `setProperty`, `resolvePathContext`, …              | Dot-paths into a model, and which segments are rows (`items.2.name` → `items.*.name`).                                        |
| `collectHideConditions`, `collectFields`, `findClosest`            | What the definition says about a path: the `hide` conditions on the way to it, its field.                                     |
| `LocalisationService`, `ListService`                               | A form's own texts and lists.                                                                                                 |
| `translateErrors`                                                  | Errors in words, for a server that answers with text (see below).                                                             |

## Rules for this package

- No Vue, no DOM: `src/core.spec.ts` checks that no source imports Vue or uses browser globals, and
  that the only dependencies are the abstractions and the expression parser. The specs run in Node.
- Nothing here holds reactive state. Functions read the model they are given; the engine passes its
  reactive model, so Vue tracks the reads.

```sh
pnpm --filter @octarine/form-core build   # dist/: index.js + types
pnpm --filter @octarine/form-core test
```
