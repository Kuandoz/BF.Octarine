# Handoff: forms work

Where the JSON-forms work stands and what comes next. Keep it current: tick items off, add
decisions as they're made, and remove what no longer applies. Repo rules (WCAG 2.2 AA, commands,
conventions) are in `CLAUDE.md`.

Last updated: 2026-10-17.

## Where things stand

`@octarine/form-engine` holds the headless engine: model, validation, conditions, localisation,
lists and the recursive renderer. It came from the earlier formrenderer, without the old legacy
import/bridge code and without the builder. There are no concrete field components yet; those go
into `@octarine/forms` (step 4 below).

Done so far:

- Engine moved in; hidden fields are not validated; the required marker follows required-if
  conditions; errors appear after leaving a field or a submit attempt (`touch`, `submit`,
  `getError`); `getErrors()` lists them in screen order; `OErrorSummary` in `@octarine/vue`;
  half/third widths in a container-query grid (`@octarine/form-engine/layout.css`).
- Tests for two forms on one page with the same paths (`src/components/twoForms.spec.ts`), with two
  `it.todo`s for field ids, to fill in with `useField`.
- Expressions go through a swappable `ExpressionLanguage` (`src/expressions.ts`). The built-in `js`
  language (`src/jsLanguage.ts`) uses subscript's parser with the engine's own evaluator;
  sandboxjs is gone. A form names its language in `definition.expressions`.
- Rule conditions get the same `env` as `hide` (they didn't before).

## Decisions

- Two packages: `form-engine` (headless, depends on Vue only) and `forms` (Octarine controls wired
  to the engine). No backwards compatibility with the old formrenderer is needed.
- No links to the old design system the formrenderer used, in code or in commit messages.
- Field ids are **not** derived from paths: two forms on a page can capture the same path. Each
  mounted field gets an id from `useId()`, and each engine keeps a path → id map for error-summary
  links (first field in screen order wins; no mounted field means no link).
- An expression language only parses and evaluates. Scope, functions, `env`, fallbacks (broken
  `hide` → visible, broken rule condition → rule stays active) and caching stay in the engine.
- `js` is the default language. FEEL (feelin, ~59 KB gzipped) may come later as a separate
  package if the larger application needs it.
- The `js` language reads a property of a missing value as `undefined`; an unknown name still fails,
  so typos are reported.

## Next steps, in order

### 1. Contract fixes

- [ ] **`attrs` bug.** `useFieldModel().attrs` passes every field property through, so
      `disabled: "locked === true"` renders a permanently disabled input, and `label`, `layout`,
      `hint`, `options` end up as junk HTML attributes. Fixed together with `useField`.
- [ ] **`useField(field)`**: the one composable a field uses. Returns `id`, `path`, `value`,
      `label`, `hint`, `required`, `disabled` (includes constants), `readonly`, `error`, `onBlur`
      (calls `touch`) and `attrs` (only the field's own extra settings). Reads the `field` prop
      reactively.
- [ ] **Path → id map** in the engine, filled by `useField` on mount and emptied on unmount;
      `getErrors()` returns `{ path, message, target }`. Fill in the two `it.todo`s in
      `twoForms.spec.ts`.
- [ ] **Errors on groups**: a rule on a container or repeat path (`address`, `items`) gets a place
      to show and a summary target (the group's first control, or the repeat's Add button).
- [ ] **`FormRows`** in the engine: renders each row of a repeat and provides its scope, so a repeat
      component only adds Add/Remove.
- [ ] **`FormRenderer`**: renders a real `<form novalidate>`, calls `submit()`, emits `submit`
      (model) or `invalid` (errors); reacts to changes in `definition`, `model` and `locale`.
- [ ] **One hide rule**: `FormComponent` uses the same visibility logic as validation
      (`isHidden`) instead of its own `resolveCondition(field.hide)`.
- [ ] Decide whether **disabled** fields are validated (they can't be fixed by the user either).

### 2. Engine API redesign

- [ ] `createForms({ fields, validators, functions, lists, translate, expressions })` replaces the
      global registries (`registerComponent`, `registerValidator`) and `provideFormRendererServices`.
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

### 3. Localisation

- [ ] Reactive locale (today it's fixed when the engine is created).
- [ ] One `translate` hook; move the engine's validation messages (`services.ts`
      `DEFAULT_MESSAGES`) into Octarine's catalogs (en, nl, fr, de).
- [ ] Flat message keys, plurals with `Intl.PluralRules`.

### 4. JSON schema for form definitions

- [ ] `forms.jsonSchema()` combines the form-level schema (validations, localisations, lists,
      defaults, constants, `expressions`) with one entry per registered field type, picked by
      `type` (from `defineField` schemas), and validator parameters.
- [ ] Check definitions against it during development.
- [ ] Use `dependencies` from compiled expressions to check that conditions name existing fields.

### 5. `@octarine/forms` and more controls

These go back and forth, one control at a time: build it in `@octarine/vue` (story, spec, axe in
every theme), then add its `defineField` in `@octarine/forms`.

- [ ] Field shell on `useField` + `OField`, submit flow with `OErrorSummary`, `layout.css`.
- [ ] Controls: Textarea, Select, Checkbox, Checkbox group, Radio group, Switch, Number, Date.
- [ ] Harder ones: Combobox/autocomplete and file upload (full WAI-ARIA keyboard patterns).
- [ ] Repeat component on `FormRows` with Add/Remove.
- [ ] Sanitise HTML/rich-text fields.

### 6. Monaco JSON editor

- [ ] Own package (e.g. `@octarine/form-editor`), Monaco loaded only when opened (it's several MB).
- [ ] Autocomplete and hover docs from the JSON schema (step 4), including registered components.
- [ ] Autocomplete and errors inside condition strings, from the expression language
      (`compile` errors carry a position; `dependencies` lists the fields read).
- [ ] Accessibility: Monaco has a screen-reader mode, but the UI around it must meet WCAG 2.2 AA.

### 7. Form builder (WYSIWYG)

- [ ] `apps/form-builder`. Property panels generated from field schemas.
- [ ] Needs: the schema (step 4), a `FormRenderer` that updates live (step 1), and a stable id per
      field in the definition for selecting and moving fields.
- [ ] Every drag-and-drop action also works without dragging, e.g. move up/down buttons
      (WCAG 2.5.7).

### 8. Custom components

Open question: which of these is meant?

- [ ] **Developers** register their own Vue component with `defineField`; the editor and builder
      pick it up from its schema. Easy once steps 2 and 5 exist.
- [ ] **Form authors without code** build reusable parts (a person block, an address block) in JSON,
      with parameters. Safe, fits the schema.
- Author-supplied _code_ would be a security boundary (sandboxed iframe); not planned.

### Later

- [ ] FEEL as an expression language in its own package (`@octarine/form-engine-feel`, on feelin),
      if the larger application needs it.
