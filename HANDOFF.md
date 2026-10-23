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
- Localisation (step 4): `@octarine/i18n` with every text in en, nl, fr and de; flat keys;
  errors follow the form's language; rule messages with parameters, plurals and conditions;
  `translateErrors` for the server.
- Storybook has a **Forms/Form engine** page with stories (contact form, prefilled, repeat, two
  forms) built on demo field components in `apps/storybook/src/forms/form-engine/`. They are the
  first draft of the `@octarine/forms` field shells (step 6).

## Package layers

```
i18n               every text Octarine writes, one JSON file per language (used by core and vue)
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

- **Localisation** (step 4, done): one `@octarine/i18n` package
  with a JSON file per language for the components and the validation messages; flat keys
  (`validation.required`), no aliases for the old ones; an app gives `messages`, `translate`
  or both; a form never replaces a built-in message by itself, a rule names its own `message`.
  Flemish Dutch with "je", polite requests ("Please…", "Gelieve…", "Veuillez…", "Bitte…").
- **Texts of custom fields and validators** (steps 6 and 9): a text lives with its owner.
  - Octarine's own texts stay in `@octarine/i18n`: the server needs the validation texts, and a
    translator gets one file per language.
  - A field type ships its own texts as JSON next to its component (not an SFC `<i18n>` block:
    that needs a Vite plugin in every app, doesn't reach the server, and author-built components
    aren't SFCs). `defineField({ messages })` and `defineValidator({ messages })` take `Catalogs`.
    File names: `IbanInput.messages.json` (every language, `{ en: {…}, nl: {…} }`) or
    `IbanInput.messages.nl.json` (one per language, so an app bundles only what it imports).
  - **Scoped to the field:** inside it `t('lookup')`, no prefix needed; two field types can't
    clash. A field type can't redefine Octarine's keys (`common.remove`, `validation.required`);
    Octarine warns when one does.
  - **No implicit overrides.** Text the form designer may change is a property of the field
    (`lookupLabel`), localisable like `label` and filled from the form's `localisations`; left
    empty, the field shows its own default. Other texts can't be changed by a form.
  - As an escape hatch, not the default way, an app can reach a field's fixed texts by the
    type's name in its own `messages` (`iban.lookup`): to add a language the field doesn't ship,
    or to fix a translation. Never through a form's table.
  - Lookup inside a field: the app's `messages` → the app's `translate` → the field type's texts →
    Octarine's texts → the key itself.
  - **Shared words:** `common.*` in `@octarine/i18n` (`common.ok`, `common.cancel`, `common.save`,
    `common.close`, `common.remove`), reachable from every `t()`. Only for action labels standing
    on their own; a word with context gets its own key, even when the English is the same
    ("Close" the verb or the adjective, French "Aucun/Aucune").
  - `checkCatalogs(messages)` exported from `@octarine/i18n` (the locales spec's check), so a
    field author's spec finds missing keys and placeholders. Later maybe a script that gathers
    every `*.messages*.json` for a translator and splits it back.

- **The form definition in three parts** (step 5, being designed): the data comes first, the form
  is a means. `docs/form-definition-example.md` shows all of it in one form.
  - `schema`: JSON Schema of the model. It takes over `validations`, `lists`, `defaults` and
    `constants` (`required`, `format`, `maxLength`, `pattern`, `enum`, `default`, `const`).
    Called `schema`, not `model`, because `model` is the data (`useForm(definition, { model })`).
  - `localisations`: texts per language, as now.
  - `components`: one view. Paths say where a value is in the model, so other views of the same
    model are possible.
  - A definition has one view. Another representation (e.g. a read-only summary) is another
    definition. `schema` is inline, or a `$ref` to a separate schema file that several
    definitions share, versioned and owned by whoever owns the data. Views are not references
    (the engine would have to be told which view to pick).
  - `localisations` can refer to shared files too, in a cascade: the definition's own texts, then
    the referred files, then the app's `messages` → `translate` → field type → Octarine → the key.
  - **The model says what is valid, a component how a value is asked.** A component takes
    `required`/`requiredWhen` (marker), `maxLength` (counter), `format` (input type), `enum`
    (options), `minimum`/`maximum`, `const`/`readOnly` and `default` from the model. It sets only
    presentation: label, hint, layout, `autocomplete`, `hide`, `disabled`/`readonly`, a choice
    between inputs that both fit, showing the counter. Never `maxLength`, `required` or `pattern`.
    So an API call with the same model is checked with the model alone, never the form.
  - A form can make a shared model stricter (`allOf: [{ $ref }]` plus its own keywords), never
    looser. For differences between environments, prefer conditions on `env`: the system gives
    every form facts about where it runs (`env.isPublic`, `env.isBackOffice`), so one model can
    say `requiredWhen: "env.isPublic"`. The server sets `env` (from the endpoint or the user),
    never the client, and an API check gets the model and that `env`. The system declares `env`'s
    facts as a schema once (app and service), so conditions on `env` are checked and completed.
  - **`hide` (view) and `requiredWhen` (model) stay separate and explicit**: hiding doesn't make
    anything optional, `requiredWhen` doesn't hide anything. The check (and the editor and
    builder) warns about a field that can be hidden while a rule of the model still applies.
    Hidden values are kept and checked as usual (a change: today a hidden field skips its rules);
    a component can say `clearWhenHidden: true` to remove its value while it's hidden.
  - **Labels, hints and every other text in a definition are explicit keys** of `localisations`.
    No implicit keys from the model path (`<path>.label`): they confuse, and the builder's table
    of texts is simpler when every text is an explicit term. The definition check warns about a
    key no table has (a typo, or literal text), which is still shown as it is.
  - **Error texts:** the model check gives `{ path, keyword, key, params }` and no text
    (`minItems` → `validation.minItems`, `{ min: 1 }`; `requiredWhen` → `validation.required`;
    `format: 'iban'` → the validator's own `validation.iban`). That's all an API call needs.
    Without more, the text is Octarine's (app `messages` → `translate` → `@octarine/i18n`). A view
    rewords per keyword on its component, with explicit keys, conditional like labels:
    `errorMessages: { minItems: 'travellersMin' }` (not `messages`: those are catalogs; not
    `validations`: those sound like rules; not `errors`: that's the current errors). It takes over
    the rule's `message`. A form's table still never rewords a built-in text by itself. A path
    without a component gets the built-in text, and the check warns about a rule that can fail on
    it. The server translates the same way (`translateErrors` reads `errorMessages`).
  - **Keywords:** today's validators become standard keywords (`required`, `minLength`,
    `maxLength`, `pattern`, `type`, `enum`, `items`/`uniqueItems` for flags, `format: email`) and
    custom formats (`phone`, `insz`, `iban`, and any the app registers; `format` asserts). Our
    own: `requiredWhen` (an expression, on the property), `minDate`/`maxDate` (a date, or
    `today`/`now`/`endofday` ± N days), `validWhen` (an expression, e.g. `endDate >= startDate`;
    explicit, instead of `compare`; its generic text needs an `errorMessages` entry, the check
    warns without one) and `check` (names of validators the app registers: async, server, …).
    Not yet: a general "rule X only when Y" (standard `if/then` covers it until a form needs
    more).
  - **Our keywords are a vocabulary**, not `x-` names: the schema's `$schema` is our meta-schema,
    which declares them with `$vocabulary` required, so a validator that doesn't support them
    refuses the schema instead of silently skipping them.
  - **Paths** are dot paths everywhere a designer writes (components, expressions, errors);
    JSON pointers from a schema validator are converted inside. A component's `path` is relative
    to the nearest component with a `path` (`group` and `repeat` alike; a group without a `path`
    is only visual). Expressions use the same scope: inside `address`, `country` is
    `address.country`, and in the schema `requiredWhen` reads the property's parent object.
    `$root.wantsCall` reaches the whole model; the `{ expression, root: true }` form goes.
  - **Options:** a component says where its options come from with `options`, and a resolver
    turns that into `[{ value, label }]`. `{ labels: 'RegisterType.Options' }`: the values are the
    model's `enum` (written once, in its order), the labels a table of the localisations the
    designer names, keyed by value; the check reports a value without a text and a text without a
    value, per language. The definition's `lists` and the old in-between `{ label, value }` lists
    go. Order (`sort`) and `clearable` stay the component's choice.
  - **Lists of objects:** the model says which values are valid, the view how they're shown.
    Our keyword `inList: { list: 'countries', value: 'alpha-3' }` (the designer picks the value
    property; the server checks it with the same `ListProvider`, in the shared rules module); the
    component only says `options: { label: 'name' }`. A component's own `{ list, value, label }`
    without `inList` works, with a warning (nothing checks the value). A label that's a string is
    shown as it is, one that's an object by language (`{ nl: 'België', fr: 'Belgique' }`) goes
    through the language chain; `getList(name, { locale })` gets the locale too.
  - Dependent lists: only a `filter` expression on `inList`
    (`"$element.province === province"`, `$element` the list item, the rest the usual scope).
    Anything more complex (the address selector) is a component of its own.
  - Without a `value` property the model stores the whole item: the selected item is locked into
    the model, so a read-only submitted form still shows what was chosen after the list changed.
    The snapshot is simply the field's value at its path (no separate metadata), described by the
    schema, ideally a `$ref` to the list item's schema, which a `ListProvider` can share.
  - **A list defines its own key** (and its item schema), registered once in the shared rules
    module: `{ name: 'countries', key: 'alpha-3', schema }`. The engine finds a snapshot in the
    current list by that key (for the check, and the selected option when editing again). A
    definition never names the key: `inList: { list: 'countries' }`, plus `value` to store one
    property instead of the item.
  - **The server checks a snapshot, it doesn't replace it:** one that differs from the current
    item with its key fails with `validation.inList`; the model is never changed silently.
    Submissions are never altered: a resubmission is a new version, so its snapshots must match
    the current list. A field opened from an older version shows that its item changed or no
    longer exists, and the person chooses again.
  - The filter goes on `inList` in the model, so the server rejects a municipality outside the
    province too. The engine knows the options depend on `province` from the compiled filter's
    `dependencies`. A snapshot filters on its code: `$element.province === province.code`.
  - A component can say `clearWhenUnavailable: true` to clear a value that drops out of its
    filtered list; by default the value stays, with `validation.inList`.
  - `options: { labels: 'Table' }` also works with `inList` (a list of codes without names): the
    label comes from the table, keyed by the value.
  - With `value` the model holds the code (small; a read-only view needs the list). Without it,
    the item (a snapshot; shows without the list). Prefer snapshots for submissions shown again.
  - Later: async list loading and server-side filtering (search, paging) for large lists. Until
    then the whole list is fetched and filtered in the browser; larger cases (the address
    selector) are components of their own.
  - **Repeats** are arrays in the model (`type: array`, `items`) shown by a `repeat` component.
    No backwards compatibility with older form formats is needed.
    - Stable row ids kept by the engine, not in the model (fixes touched state after a remove).
    - `minItems`/`maxItems` disable Add/Remove, and the component says why (not only greyed out).
    - A new row starts from `items`' `default`s.
    - `uniqueBy: 'insz'` (own keyword) for rows unique by a property; `uniqueItems` compares
      whole items only.
    - Rules over all rows with `validWhen` on the array and functions
      (`sum(items, 'amount') <= 1000`).
    - A row title is `itemLabel`, a key with parameters from the row (`{index}`, `{name}`).
    - Move up/down buttons (also the non-drag alternative for the builder, WCAG 2.5.7).
    - Arrays of plain values (a list of email addresses) as well as of objects.
    - Cards or a table is the component's choice; nested repeats follow the relative paths.
  - Texts in the schema (`title`, `description`) only describe the model for the people who design
    and maintain it. They aren't localised for now.
  - **The JSON Schema validator is json-schema-library** (decided 2026-10-23; trial in Node with
    `--disallow-code-generation-from-strings`, like a strict CSP):
    - Ajv generates code (`new Function`), so a browser needs CSP `unsafe-eval`; its standalone
      build-time mode doesn't fit definitions loaded at runtime. @cfworker/json-schema has no
      custom keywords.
    - `@hyperjump/json-schema` 1.18: passes without eval; real vocabularies and `$vocabulary`;
      custom formats; 19 KB gzip (its Node file plugin needs stubbing in a bundler). But: the
      keyword API is "experimental", schema loading is async, a `required` error doesn't say which
      property is missing, and there is no "schema at this path" API.
    - `json-schema-library` 11.6: passes without eval; custom keywords and formats through
      `extendDraft`; errors carry a code and data (`required` names the key); `getNode(pointer)`
      gives the schema at a path (for a component's `maxLength`, `enum`), `getData` fills
      defaults; sync `validate` with `errorsAsync` for async keywords. 32 KB gzip; doesn't read
      `$vocabulary` (only matters for other validators); depends on `valid-url` (last release 2022).
    - Both: a keyword on a property doesn't run when the property is absent, so `requiredWhen` and
      `validWhen` are moved to the parent object when the schema is loaded (they need the parent
      as scope anyway).
    - Chosen for its form features (errors with data, `getNode`, `getData`). It sits behind
      form-core, so it can still be swapped.
  - **`mapping` is not the engine's:** turning the model into another system's shape belongs to
    the application that uses the form. The definition has no `mapping` section.
  - **Parts** (shared pieces of a form, the old `formPart`) have the same shape as a definition:
    `schema`, `localisations`, `components`. A form places one at a path:
    `{ "part": "contact", "path": "contact" }`. A form is a part placed at the root.
    - A part doesn't add its schema to the form: the form's model says what is at that path
      (`contact: { $ref: contact.schema.json }`), and the check warns when it isn't the schema the
      part declares. The model stays the only source of truth.
    - What old parts merged in finds a place in the model: validations in the shared schema,
      defaults and constants as `default`/`const`, a variant (`fixedDutch`) as a stricter model
      (`allOf` with `const`).
    - Paths and expressions inside a part are relative to where it's placed; parts can contain
      parts, and the engine stops at a cycle.
    - Parts are found by name through a loader the app gives (like `ListProvider`), so the
      engine knows nothing about files or URLs.
    - **A part's texts are scoped to it**, like a field type's: its components read the part's
      own table, then the form's, the shared tables, the app and Octarine. A form rewords a part's
      text explicitly under the part's name: `"nl": { "contact": { "email": "Mailadres" } }`.
      Two parts with the same key never overwrite each other.
    - A placement takes the presentation options of a group (`hide`, `disabled`, `readonly`,
      `clearWhenHidden`) for the part as a whole. **Settings inside a part are its `props`**,
      declared with a schema in the part (`props: { type: 'object', properties: { askPhone: … } }`)
      and filled in by the placement (`"props": { "askPhone": false }`). Only declared props can
      be set; the check warns about an unknown or wrongly typed one. Expressions in the part's
      components read them as `$props.askPhone`.
    - `$props` exists only in the view, so it drives presentation only (`hide`, `disabled`,
      labels). What makes a value required or invalid stays in the model (`env`, a stricter
      schema), so the server still checks a submission with the schema alone.
    - A changeable text is a prop whose value is a key of the form's table
      (`"props": { "title": "contactTitle" }`), like a field type's `lookupLabel`.

## Open decisions

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

### 4. Localisation (done)

- [x] **`@octarine/i18n`** (no Vue, no DOM, no dependencies): `locales/{en,nl,fr,de}.json` hold
      every text Octarine writes, the components' and the validation messages;
      `locales/en.descriptions.json` gives translators the context of each key. `formatMessage`
      fills in `{name}`, `{min:date}`, `{min:datetime}`, `{n:number}` with `Intl`, and plurals
      (`{ "one", "other" }`, `Intl.PluralRules`). `translate(sources, key, params, locale)` walks
      `nl-BE` → `nl` → the form's default → `en` in each catalog source and asks function sources
      with the requested locale. English is built in; apps import the other files. A spec checks
      every language for the same keys and placeholders as English.
- [x] **Components:** `src/i18n/messages.ts` is gone. Flat keys (`field.optional`,
      `counter.charactersLeft`, …); `useMessages()` gives `t('key', params)`;
      `createMessages({ nl, fr })` takes catalogs. The specs and Storybook install nl, fr and de.
- [x] **Forms:** keys are `validation.*` (no aliases). `createForms`/`useForm` take `messages`
      (combined per language) and `translate(key, params, locale)`, which may return `undefined`.
      Labels, hints and rule messages: form `localisations` → app `messages` → app `translate` →
      English → the key itself. A validator's key skips the form's table: a form rewords an error
      only through its rule's `message`, which gets the rule's parameters and plurals and can be a
      choice by condition (`LocalisableString`, chosen by `FormValidator.chooseText`).
- [x] Dates say why they failed: `validation.date`, `dateMin`, `dateMax`, `dateRange` (and the
      `datetime` ones), with the bounds as `YYYY-MM-DD` (or an ISO moment) parameters.
- [x] `translateErrors(errors, definition, locale, { messages, translate })` in form-core;
      `validateSubmission` chooses a conditional `message` against the submitted model.
- [x] The Storybook demo's errors follow the toolbar language. READMEs (i18n, form-core,
      form-engine, vue), the Storybook pages and CLAUDE.md describe it.

Left over:

- [ ] An app registers its languages twice: `createMessages` for the components and
      `createForms({ messages })` for the forms. `@octarine/forms` (step 6) can pass one to the
      other.
- [ ] Texts of custom fields and validators: decided (see decisions), built in steps 6 and 9.
- [ ] "Today" is the checker's clock and time zone, so near midnight the browser and the server can
      disagree about a date bound. The server would need the user's time zone in `env`.
- [ ] `MessageKey` in `@octarine/vue`'s types reads `@octarine/i18n/locales/en.json`, so an app's
      TypeScript needs `resolveJsonModule` (or `skipLibCheck`).
- [ ] The demo's error summary joins label and message with ": ", which French writes with a narrow
      no-break space. The summary entry's format should come from the catalogs too.
- [ ] The new nl/fr/de texts are drafts: have a native speaker read them.

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
- [ ] Field shells show `pending` ("Checking…") in a polite live region, and the submit button
      follows `submitting`.
- [ ] Controls: Textarea, Select, Checkbox, Checkbox group, Radio group, Switch, Number, Date.
- [ ] Harder ones: Combobox/autocomplete and file upload (full WAI-ARIA keyboard patterns).
- [ ] Repeat component on `FormRows` with Add/Remove.
- [ ] Sanitise HTML/rich-text fields.
- [ ] `common.*` words in `@octarine/i18n` (with the first dialog or button bar).
- [ ] `useFieldMessages()`: the field's `t()`, following the form's language. The controls' texts
      go through it from the start, so step 9 only adds the field type's own catalog.

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
- [ ] Texts per field type and validator: `defineField({ messages })`, `defineValidator({ messages })`,
      scoped to the field, with changeable text as localisable properties; `checkCatalogs` exported
      from `@octarine/i18n`. See decisions.

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
