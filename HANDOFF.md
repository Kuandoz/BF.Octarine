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

`@octarine/form-engine` holds the headless engine: model, validation, conditions, localisation,
lists and the recursive renderer. It came from the earlier formrenderer, without the old legacy
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
- Storybook has a **Forms/Form engine** page with stories (contact form, prefilled, repeat, two
  forms) built on demo field components in `apps/storybook/src/forms/form-engine/`. They are the
  first draft of the `@octarine/forms` field shells (step 6).

## Package layers (planned)

```
form-abstractions  types and interfaces only, no runtime code (+ the JSON schema, as data)
       ↓
form-core          validation runtime: no Vue, no DOM; runs in Node and in the browser
       ↓
form-engine        Vue: reactive state, touched/submitted, renderer, composables (headless)
       ↓
forms              Octarine controls wired to the engine
form-editor, apps/form-builder, the Node form service
```

- **`form-abstractions`**: `FormDefinition`, `FieldDefinition`, `ValidationRule`,
  `ConditionValue`, `ValidationResult`, the error format, and the interfaces other packages
  implement: `ExpressionLanguage`, `Validator`, `SubmissionValidator`, `TranslationProvider`,
  `ListProvider`. A FEEL package, a custom-validator package or a remote client depends only on this.
- **`form-core`**: path helpers, `items.*` expansion, visibility, required-if, expressions,
  validators, lists, defaults and constants. One pure entry point, roughly
  `validateSubmission(definition, model, { validators, functions, lists, env })` →
  `{ valid, errors: [{ path, rule, key, params }] }`. Errors are message keys with parameters, so
  the server can translate them or hand them back for the client to translate.
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

## Open decisions

- **Disabled and read-only fields** are validated (as today, for the same reason as hidden ones).
  Open: can the server trust their values, since the client can send anything for them? (See
  server-side rules below.)
- **Custom components** (step 9): developer components, author-built reusable parts, or both.

## Next steps, in order

### 1. Contract fixes (done)

All items done. Left over, for later steps:

- [ ] The engine recognises a repeat by `type: 'repeat'` (for `isHidden`, labels and screen order).
      A custom repeat type needs to say it has rows; part of `defineField` (step 3).
- [ ] Rows are keyed by index, and touched state by path: after removing row 1, row 2 (now row 1)
      takes over row 1's touched state. Stable row ids would fix it.
- [ ] After Remove, focus has to go somewhere sensible (the next row, or the Add button); that's
      the repeat component's job in step 6.

### 2. Split `form-abstractions` and `form-core` out of `form-engine`

- [ ] Move types and interfaces to `form-abstractions` (types only; a test checks the built output
      has no runtime code).
- [ ] Move validation, conditions, expressions, paths, lists, defaults/constants to `form-core`
      (no Vue import; a test checks this). Expose `validateSubmission`.
- [ ] `form-engine` keeps the Vue state (touched, submitted, dirty, reactive results) and the
      renderer, and calls `form-core`.
- [ ] Error format with keys and parameters; translation happens at the edge.
- [ ] `SubmissionValidator` interface with the local implementation.

### 3. Engine API redesign

- [ ] `createForms({ fields, validators, functions, lists, translate, expressions })` replaces the
      global registries (`registerComponent`, `registerValidator`) and `provideFormRendererServices`.
      Validators and functions come from the shared registration module.
- [ ] `defineField({ type, component, schema })`: typed field schemas instead of passing every
      property through. Validators declare their parameters the same way.
- [ ] `useForm(definition, options)` with `<FormRenderer :form>`; an options object instead of the
      `FormEngine` constructor's seven positional parameters.
- [ ] Explicit repeat scope instead of the `useFormEngine()` Proxy.
- [ ] `reset()`, `markPristine()`, form-level dirty state.
- [ ] Say clearly whether the app's `model` object is updated. Today the engine copies it (which
      keeps two forms apart); values are read from `engine.model`.
- [ ] Drop **mitt**: it backs one event (`modelChanged`) that nothing in the package listens to;
      apps can `watch(engine.model)`.
- [ ] Configurable expression functions (`age()` is the only one, and hard-coded).
- [ ] Async validators with a pending state; delegating a rule to the server.

### 4. Localisation

- [ ] Reactive locale (today it's fixed when the engine is created).
- [ ] One `translate` hook; move the engine's validation messages (`services.ts`
      `DEFAULT_MESSAGES`) into Octarine's catalogs (en, nl, fr, de).
- [ ] Flat message keys, plurals with `Intl.PluralRules`.

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
- [ ] **Form authors without code** build reusable parts (a person block, an address block) in JSON,
      with parameters. Safe, fits the schema.
- Author-supplied _code_ would be a security boundary (sandboxed iframe); not planned.

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
3. **Values the user couldn't edit**: constants must equal the server's values. Disabled and
   read-only fields need a decision (see open decisions): the client can send anything for them.
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
