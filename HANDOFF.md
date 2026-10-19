# Handoff: forms work

Where the JSON-forms work stands and what comes next. Keep it current: tick items off, add
decisions as they're made, and remove what no longer applies. Repo rules (WCAG 2.2 AA, commands,
conventions) are in `CLAUDE.md`.

Last updated: 2026-10-18.

## What this is for

End users of an application create forms themselves (in the JSON editor or the builder), and other
users fill them in, client-side, inside that application. Client-side validation helps the person
filling in the form, but it can't be trusted: whatever is submitted must be validated again on the
server, against the form's definition.

The backend is .NET (C#). The plan is a **Node service** that does the form work for it: validating
submissions, checking that a form definition is valid, and other form-related tasks later. .NET calls
it. This is a starting assumption, not a fixed choice: the abstractions must allow moving the work
elsewhere later (another runtime, back into .NET, or in-process) without changing the forms.

Lesson from the previous system: validations were written twice, in JS and in C#, and the client
fell back to the server for complicated ones (and for ones that need data only the server has).
Keeping two implementations in step was the problem. Here there is **one implementation**, and the
client can still delegate a rule to the server when it needs server data. Even FEEL would leave room
for small differences between a JS and a .NET implementation, so staying on one platform is
preferred.

## Where things stand

The forms are three packages: `@octarine/form-abstractions` (types and interfaces only),
`@octarine/form-core` (the rules: validation, conditions, expressions, paths, lists; no Vue) and
`@octarine/form-engine` (the Vue side: reactive state, touched/submitted, error messages, the
renderer and composables). The engine came from the earlier formrenderer, without the old legacy
import/bridge code and without the builder. There are no concrete field components yet.

Done so far:

- Engine moved in; hidden fields are validated like any other (form designers pair `hide` with a
  required-if); the
  required marker follows required-if conditions; errors appear after leaving a field or a submit
  attempt (`touch`, `submit`, `getError`); `getErrors()` lists them in screen order; `OErrorSummary`
  in `@octarine/vue`; half/third widths in a container-query grid
  (`@octarine/form-engine/layout.css`).
- Tests for two forms on one page with the same paths (`src/components/twoForms.spec.ts`),
  including their field ids and error-summary targets.
- The field contract (step 1): `useField` with ids from `useId()` and a path → id map per engine;
  `getErrors()` gives `{ path, message, label, target? }`; group errors target the group's first
  control (or a control the group registers, like a repeat's Add button) and follow changes inside
  the group; `FormRows`; `FormRenderer` renders `<form novalidate>`, emits `submit`/`invalid`
  and follows `definition`, `model` and `locale`; `FormComponent` and `isHidden` share one hide
  check.
- Expressions go through a swappable `ExpressionLanguage` (`src/expressions.ts`). The built-in `js`
  language (`src/jsLanguage.ts`) uses subscript's parser with the engine's own evaluator;
  sandboxjs is gone. A form names its language in `definition.expressions`.
- Rule conditions get the same `env` as `hide` (they didn't before).
- A value change re-runs every rule, so rules that depend on another field (required-if, compare)
  stay up to date after a submit.
- The split (step 2): `form-abstractions` and `form-core` exist; the engine calls form-core's
  `FormValidator` over its reactive model; errors are message keys with parameters, put into words
  only by `getError`; `validateSubmission` and a local `SubmissionValidator` check a submitted
  model the way the browser does.
- Disabled, read-only and constant values are validated but show no error and don't block the
  submit (`isLocked`, following containers and rows like `isHidden`).
- The engine API (step 3): `createForms` + `defineField` + `useForm` instead of global
  registries and positional parameters; dirty state with `markPristine`/`reset`; async rules
  with a pending state and `delegateToServer`.
- Storybook has a **Forms/Form engine** page with stories (contact form, prefilled, repeat, two
  forms) built on demo field components in `apps/storybook/src/forms/form-engine/`. They are the
  first draft of the `@octarine/forms` field shells (step 6).

## Package layers

```
i18n               every text Octarine writes, one JSON file per language (planned, step 4)
form-abstractions  types and interfaces only, no runtime code (+ the JSON schema, as data)
       ↓
form-core          validation runtime: no Vue, no DOM; runs in Node and in the browser
       ↓
form-engine        Vue: reactive state, touched/submitted, renderer, composables (headless)
       ↓
forms              Octarine controls wired to the engine (planned)
form-editor, apps/form-builder, the Node form service (planned)
```

- **`form-abstractions`**: `FormDefinition`, `FieldDefinition`, `ValidationRule`,
  `ConditionValue`, `ValidationResult`, the error format, and the interfaces other packages
  implement: `ExpressionLanguage`, `Validator`, `SubmissionValidator`, `TranslationProvider`,
  `ListProvider`. A FEEL package, a custom-validator package or a remote client depends only on this.
- **`form-core`**: path helpers, `items.*` expansion, visibility, required-if, expressions,
  validators, lists and messages. `validateSubmission(definition, model, { validators, functions,
expressionLanguages, env })` → `{ valid, errors: [{ path, rule, key, params, message? }] }`.
  Errors are message keys with parameters, so the server can translate them or hand them back for
  the client to translate. Defaults and constants are still seeded by the engine (`mergeDeep`);
  the server's handling of constants is in the server-side rules below.
- **`form-engine`** becomes a thin Vue layer over `form-core`. Vue tracks reads of reactive objects
  inside plain functions, so the engine calls the same core functions inside computeds; there is no
  second implementation to drift.

Abstractions that keep the "where does it run" choice open:

- **`SubmissionValidator`** interface with a local implementation (`form-core`, in-process) and a
  remote one (HTTP to the form service). The client and .NET both talk to the interface.
- **Async validators** and **server-only rules**: a rule that needs server data runs on the server;
  the client delegates it (through the remote `SubmissionValidator`) instead of reimplementing it.
  Validators may return a promise; the engine shows a pending state.
- **Shared registration**: custom validators and expression functions live in one module that the
  client and the service both import. A validator that exists only on the client would let anything
  through on the server.
- **Definition checks** (is this JSON a valid form?) are a service function too, built on the JSON
  schema and the expression languages' `compile`.

## Decisions

- Packages as above. No backwards compatibility with the old formrenderer is needed.
- No links to the old design system the formrenderer used, in code or in commit messages.
- Server-side validation is assumed to run in Node first, behind interfaces that allow moving it.
- Field ids are **not** derived from paths: two forms on a page can capture the same path. Each
  mounted field gets an id from `useId()`, and each engine keeps a path → id map for error-summary
  links (the first field mounted for a path wins; no mounted field means no link). A page with
  several Vue apps gives each its own `app.config.idPrefix`.
- `FormRenderer` compares `definition` and `model` by content, so an inline `:model="{}"` doesn't
  reset the form on every render. A changed definition keeps the values filled in; a changed model
  starts over; a changed locale switches in place.
- An expression language only parses and evaluates. Scope, functions, `env`, fallbacks (broken
  `hide` → visible, broken rule condition → rule stays active) and caching stay in the engine.
- `js` is the default language. FEEL (feelin, ~59 KB gzipped) may come later as a separate
  package if the larger application needs it.
- The `js` language reads a property of a missing value as `undefined`; an unknown name still fails,
  so typos are reported.
- Values of hidden fields are **kept** in the model, not dropped: hidden fields can carry values
  for machines (codes, ids) behind the scenes.
- Hidden fields are **validated** like any other, so a tampered value can't slip through by hiding
  its field. `hide` and `required` stay independent: a form that asks for a value only while
  its field is shown pairs `hide` with a required-if (`condition`). That's the form designer's
  call, not the engine's.

- **Disabled and read-only fields** are validated like any other, on both sides. In the browser
  their errors are **not shown**: the person can't change the value, so marking it invalid only
  blocks them. The server doesn't trust their values (see server-side rules).
- **Custom components** (step 9) can be built by **both** developers and form authors, and must be
  easy for someone with a basic understanding of HTML, JS and Tailwind.
- `ValidatorResult` is `{ valid, key?, params? }`, so `{ valid: value !== '' }` is a whole
  validator; a missing key falls back to the generic "isn't valid" message.
- `validateSubmission` declares every field the form defines on a copy of the model, as the engine
  does on load, so a key the client left out reads as `undefined` instead of keeping a required-if
  active.

- **Localisation** (step 4): see the plan in step 4. In short: one `@octarine/i18n` package
  with a JSON file per language for the components and the validation messages; flat keys
  (`validation.required`), no aliases for the old ones; an app gives `messages`, `translate`
  or both; a form never replaces a built-in message by itself, a rule names its own `message`.
  Flemish Dutch with "je", polite requests ("Please…", "Gelieve…", "Veuillez…", "Bitte…").

## Open decisions

- **A scope per field type**: `defineField({ messages })` so a custom component ships its own
  texts (`field.iban.lookup`), which forms and apps can override. Now (in step 4) or later?

- **A failed rule on a disabled or read-only field** blocks nothing in the browser, since it isn't
  shown, so the submit goes through and the server rejects it. Should the form say something
  (a general "this form can't be sent, contact …" message) instead?
- **Author-built components with HTML and JS** (step 9): code written by one user runs in other
  users' browsers, which is a security boundary. Options: a template language with no script
  (HTML + Tailwind classes + the form's own expressions), or real JS in a sandboxed iframe. Tailwind
  classes an author types at runtime also aren't in the built CSS, so they need a safelist or a
  runtime Tailwind.

## Next steps, in order

### 1. Contract fixes (done)

All items done. Left over, for later steps:

- [x] A custom repeat type says it has rows with `defineField({ rows: true })` (step 3); the server
      gets the same list through `repeatTypes`.
- [ ] Rows are keyed by index, and touched state by path: after removing row 1, row 2 (now row 1)
      takes over row 1's touched state. Stable row ids would fix it.
- [ ] After Remove, focus has to go somewhere sensible (the next row, or the Add button); that's
      the repeat component's job in step 6.

### 2. Split `form-abstractions` and `form-core` out of `form-engine` (done)

All items done. Left over, for later steps:

- [ ] `FormEngine.spec.ts` and `expressions.spec.ts` still test some rules through the engine;
      move pure ones to form-core when touching them.

### 3. Engine API redesign (done)

- [x] `createForms(options)` (fields, validators, functions, expressionLanguages, repeatTypes,
      lists, translate) replaces the global registries and `provideFormRendererServices`. The rule
      options have the shape of `validateSubmission`'s, so one module feeds both.
- [x] `defineField({ type, component, rows?, schema? })` and `defineValidator({ validate, schema })`;
      the built-in validators declare their parameters. `schema` is JSON Schema data for step 5; the
      field's props are still passed through as `attrs` (no TS types derived from the schema).
- [x] `useForm(definition, options)` with `<FormRenderer :form>`; `new FormEngine(definition, options)`
      instead of seven positional parameters.
- [x] Explicit repeat scope instead of the `useFormEngine()` Proxy: calls take the row.
- [x] `reset()`, `markPristine()`, `dirty`/`isDirty(path)`, comparing values with the pristine
      ones (empty values count as none).
- [x] The app's `model` is never changed: the engine works on a copy (documented).
- [x] mitt is gone; apps can `watch(engine.model)`.
- [x] Configurable expression functions, added to `age()`.
- [x] Async validators with a pending state (`isPending`, `pending`, `submitting`, `aria-busy`);
      `submit()` is async and waits; a check that can't run fails closed and is retried on submit.
      `delegateToServer(submissionValidator)` leaves a rule to the server; validators get `model`,
      `definition` and `env`. `validateSubmission` is async.

Left over:

- [ ] An async answer is reused while the path's own value is the same; a server rule that also
      depends on other fields isn't asked again when they change.
- [ ] No debounce: an async validator called on every keystroke should debounce itself. A helper
      may be worth adding once a real one exists.
- [ ] `delegateToServer` sends the whole model for one rule; a remote `SubmissionValidator` that
      can check one rule would be cheaper (step 10).

### 4. Localisation

Planned and agreed; not started. The locale is already reactive (`setLocale`, step 3).

**Package `@octarine/i18n`**: no Vue, no DOM, no dependencies (a layer like `icons`).

- [ ] `locales/{en,nl,fr,de}.json`: every text Octarine writes, the components' and the
      validation messages, in one file per language. Translating a language means copying one
      file (from any language) and translating its values. `locales/en.descriptions.json` gives
      translators the context of each key, since JSON has no comments.
- [ ] `format`: `{name}` parameters, `{min:date}` and `{amount:number}` formatted with `Intl` in
      the message's language, plurals as `{ "one": "…", "other": "…" }` picked with
      `Intl.PluralRules`.
- [ ] Language fallback in every lookup: `nl-BE` → `nl` → the form's default → `en`. English is
      always included; other languages are imported (or lazily loaded) by the app.
- [ ] A spec checks every language: no missing or unknown keys, the same placeholders as English.

**Components** (`@octarine/vue`), first, with no visible change:

- [ ] The texts in `src/i18n/messages.ts` move to the catalogs as data with flat keys
      (`field.optional`, `field.required`, `form.requiredNote`, `error.label`,
      `errorSummary.title`, `input.clear`, `status.loading`, `counter.maxLength`,
      `counter.charactersLeft`, `counter.charactersOver`); the plural functions become
      `one`/`other` entries. `createMessages` takes catalogs; `useMessages()` keeps working.

**Forms** (form-core, form-engine):

- [ ] Keys lose the prefix: `formRenderer.validation.required` → `validation.required`. No aliases;
      nothing outside the repo uses the old names.
- [ ] One translator for labels, hints and errors. A key is looked up in: the form's
      `localisations` → the app's `messages` → the app's `translate(key, params, locale)`
      (returns `undefined` for a key it doesn't know) → the built-in catalog → the key itself,
      with a warning once. `createForms` and `translateErrors` take `messages`, `translate` or
      both; `useForm` can still replace them for one form.
- [ ] `TranslationProvider.t` gets a `locale` argument and may return `undefined`.
- [ ] A form's table never replaces a built-in message. A rule that should say something else
      names a key with `message`; that key gets the rule's parameters (`{max}`) and plurals, the
      language fallback, and can come from the app's `messages` too (one shared custom message).
      `message` also takes the conditional form labels have (`LocalisableString`).
- [ ] Dates: the validator says why a date failed, with the bounds as `YYYY-MM-DD` parameters:
      `validation.date` (not a date), `dateMin` (`{min}`), `dateMax` (`{max}`), `dateRange`
      (both). The same four for `datetime`. `today+1` is shown as the actual date.
- [ ] `translateErrors(errors, definition, locale, { messages, translate })` in form-core, for a
      server that returns text instead of keys.
- [ ] Storybook: the demo's errors follow the toolbar language. Docs for authors (rule messages,
      plurals, `{min:date}`) and for translators (the catalog files).

**Texts**: Flemish Dutch with "je" where a pronoun is needed; polite requests ("Please enter…",
"Gelieve … in te vullen.", "Veuillez saisir…", "Bitte geben Sie … ein."); say how to fix it where
that's known; examples use `name@example.com` and the sample IBAN `BE68 5390 0754 7034`.
`pattern` and `compare` can't know what's expected, so the docs tell authors to give those rules a
`message`.

Left over:

- [ ] "Today" is the checker's clock and time zone, so near midnight the browser and the server can
      disagree about a date bound. The server would need the user's time zone in `env`.

### 5. JSON schema for form definitions

- [ ] `forms.jsonSchema()` combines the form-level schema (validations, localisations, lists,
      defaults, constants, `expressions`) with one entry per registered field type, picked by
      `type` (from `defineField` schemas), and validator parameters. The base schema ships in
      `form-abstractions` as data.
- [ ] Check definitions against it during development, and in the service.
- [ ] Use `dependencies` from compiled expressions to check that conditions name existing fields.
- [ ] Warn the form designer about a field that can be hidden but has an unconditional `required`
      (or another rule that can fail on a value the user can't see), in the editor, the builder and
      the definition check.

### 6. `@octarine/forms` and more controls

These go back and forth, one control at a time: build it in `@octarine/vue` (story, spec, axe in
every theme), then add its `defineField` in `@octarine/forms`.

- [ ] Field shell on `useField` + `OField`, submit flow with `OErrorSummary`, `layout.css`. Start
      from the Storybook demo fields (`apps/storybook/src/forms/form-engine/`).
- [ ] `OForm` and `FormRenderer` both render a `<form>`, so they can't be nested: the demo shows
      the required note itself. Let one of them render without a `<form>` (e.g. an `as` prop).
- [ ] The demo checkbox is a native one: `@octarine/vue` has no checkbox yet.
- [ ] The engine's validation messages are English only until step 4; the demo's labels follow
      the page language, its errors don't yet.
- [ ] Field shells show `pending` ("Checking…") in a polite live region, and the submit button
      follows `submitting`.
- [ ] Controls: Textarea, Select, Checkbox, Checkbox group, Radio group, Switch, Number, Date.
- [ ] Harder ones: Combobox/autocomplete and file upload (full WAI-ARIA keyboard patterns).
- [ ] Repeat component on `FormRows` with Add/Remove.
- [ ] Sanitise HTML/rich-text fields.

### 7. Monaco JSON editor

- [ ] Own package (e.g. `@octarine/form-editor`), Monaco loaded only when opened (it's several MB).
- [ ] Autocomplete and hover docs from the JSON schema (step 5), including registered components.
- [ ] Autocomplete and errors inside condition strings, from the expression language
      (`compile` errors carry a position; `dependencies` lists the fields read).
- [ ] Accessibility: Monaco has a screen-reader mode, but the UI around it must meet WCAG 2.2 AA.

### 8. Form builder (WYSIWYG)

- [ ] `apps/form-builder`. Property panels generated from field schemas.
- [ ] Needs: the schema (step 5) and a stable id per field in the definition for selecting and
      moving fields. `FormRenderer` already follows a changed definition (step 1).
- [ ] Every drag-and-drop action also works without dragging, e.g. move up/down buttons
      (WCAG 2.5.7).

### 9. Custom components

- [ ] **Developers** register their own Vue component with `defineField`; the editor and builder
      pick it up from its schema. Easy once steps 3 and 6 exist.
- [ ] **Form authors** build reusable parts (a person block, an address block) with parameters. The
      bar: someone with a basic understanding of HTML, JS and Tailwind can make one. How their
      HTML and JS run safely is an open decision (above).

### 10. Node form service

- [ ] Validates submissions (`validateSubmission`) and form definitions for .NET; more form tasks
      later. Remote `SubmissionValidator` for the client.
- [ ] Implements the server-side rules below.

### Later

- [ ] FEEL as an expression language in its own package (`@octarine/form-engine-feel`, on feelin),
      if the larger application needs it.

## Server-side rules (for later)

Not to be addressed now; a record of what the server must do beyond running the same rules as the
client.

1. **Use its own stored definition**, never one sent along with the submission. Definitions get a
   `version`, and a submission is checked against the version it was filled in on.
2. **Drop or reject values the form doesn't define**, so a submission can't add fields to the
   model that the form never asked for.
3. **Values the user couldn't edit** aren't trusted: constants must equal the server's values, and
   for disabled and read-only fields the server uses the value it knows (stored, prefilled or
   computed) and rejects a different one. The client can send anything for them.
4. **Same clock and timezone on both sides.** `age()`, `today+1` and `now` depend on them, so
   `now` and the timezone go into `env`; otherwise the client and the server disagree around
   midnight.
5. **Logic written by end users is untrusted on the server.**
   - Expressions can't reach anything outside their data, but get limits on length and nesting.
   - The `pattern` validator runs a user-written regex: that can hang the server (ReDoS), so it
     needs a safe regex engine or a time limit.
   - The model gets size limits (number of rows, string length).
6. **One registration module** for custom validators and functions, imported by the client and the
   service, so no rule exists on one side only.
