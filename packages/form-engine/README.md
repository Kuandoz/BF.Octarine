# @octarine/form-engine

See the [repo root README](../../README.md) for install/quickstart. This doc
covers the package's API in depth.

Headless engine for rendering a form from a JSON definition. It owns the reactive
model, validation, and the recursive rendering pipeline — it ships with **no
concrete field components**. Those come from [`@octarine/forms`](../forms) (planned) or
from your own components, wired in as described below.

## The component contract

Any component you want `FormRenderer` to be able to render must accept exactly
one prop:

```ts
{
  field: FieldDefinition // the JSON node describing this field (type, path, label, ...)
}
```

The reactive model + validation shared across the whole form — the
`FormEngine` — is not a prop. `FormRenderer` provides it (via Vue's
`provide`/`inject`) to its entire component subtree, and any component reaches
it with the `useFormEngine()` composable:

```ts
import { useFormEngine } from '@octarine/form-engine'

const formEngine = useFormEngine()
```

It's responsible for its own read/write wiring — read the current value with
`formEngine.getValue(field.path)`, write changes with
`formEngine.setValue(field.path, value)`. Nothing else is assumed about how the
component looks or what UI library backs it.

The `useFieldModel` composable does that read/write wiring for you — pass it
`field` (it resolves the `FormEngine` itself via `useFormEngine()`), get back a
`path` ref, a writable `value` ref, and `attrs`: every other property on
`field` (anything beyond our own
`type`/`path`/`components`/`hide`), meant for `v-bind` so an
extra JSON property your wrapper never explicitly wires up (`maxLength`,
`pattern`, `icon`, ...) still reaches the underlying control automatically —
the same "spread the field config, then override what you've actually
processed" pattern the legacy `_forms` system used. Vue merges `v-bind`
objects with individual bindings in template order, so put `attrs` first:

```vue
<script setup lang="ts">
import { useFieldModel } from '@octarine/form-engine'
import type { FieldDefinition } from '@octarine/form-engine'

const props = defineProps<{ field: FieldDefinition }>()
const { value, attrs } = useFieldModel<string>(props.field)
</script>

<template>
  <input v-bind="attrs" v-model="value" />
</template>
```

`useFormEngine()` throws if called outside a `FormRenderer`'s subtree — a
clear failure the first time a component is mounted standalone (Storybook, an
isolated test), rather than a silent `undefined`. In a test, provide a
`FormEngine` yourself using the exported `FORM_ENGINE_KEY`, e.g. with
`@vue/test-utils`:

```ts
import { FORM_ENGINE_KEY } from '@octarine/form-engine'

mount(MyField, {
  props: { field },
  global: { provide: { [FORM_ENGINE_KEY]: engine } },
})
```

## How resolution works

`FormComponent.vue` looks up `registry[field.type]` for every field and renders
whatever it finds via `<component :is="...">`:

```ts
const registry = inject(REGISTRY_KEY, getGlobalRegistry())
function resolve(type: string) {
  return registry[type] // e.g. registry["text"] → TextField
}
```

`registry` is just `Record<string, Component>` — a flat map from the `type`
string used in your JSON to a Vue component. So `{ type: "text", path:
"firstName" }` resolves to whatever is registered under the key `"text"`. If
nothing is registered for a given type, a dev-mode warning is logged and that
field renders nothing.

## Registering components

There are three ways to put a component into that map.

### 1. Global, from anywhere (simplest)

`registerComponent`/`registerComponents` mutate a module-level registry
singleton:

```ts
import { registerComponent, registerComponents } from '@octarine/form-engine'
import { fields } from '@octarine/forms'

registerComponents(fields)
registerComponent('myCustomType', MyCustomField)
```

Call this once, anywhere before your forms mount (e.g. the top of `main.ts`).

### 2. As a Vue plugin

Same effect, `app.use()`-idiomatic:

```ts
import { createFormRendererPlugin } from '@octarine/form-engine'
import { fields } from '@octarine/forms'

app.use(createFormRendererPlugin({ components: fields }))
```

### 3. Scoped to one `<FormRenderer>` instance

Pass a `components` prop; it merges on top of the global registry (via
`provide`), scoped to that instance's subtree only — it won't leak to other
forms on the page. Handy for Storybook, tests, or overriding a single field
type locally:

```vue
<FormRenderer :form-engine="engine" :components="fields" />
```

## Adding a new field type

A field type is a component with the contract above, registered under the
`type` string your JSON uses:

```ts
registerComponent('date', DateField)
```

Then any form JSON with `{ type: "date", path: "birthDate" }` renders it, with
no changes to `FormRenderer` or `FormComponent`.

## Validation

**Validation lives on the form, not on the field.** A `FieldDefinition` only
describes how something is _displayed_ — a validation rule is a statement
about the _model_, independent of whatever (if anything) renders that path.
So `FormDefinition.validations` is a separate, form-level dictionary, keyed by
the resolved model dot-path each rule set applies to:

```ts
validations: {
  firstName: [{ type: "required" }],
  password: [{ type: "required" }, { type: "minLength", value: 8 }],
};
```

**Hidden fields are not validated.** The user can't see or fix them, so a
required field behind `hide: "wantsCall !== true"` doesn't block the form.
`engine.isHidden(path)` tells whether every field that shows a path is hidden,
by its own `hide`, a container's, or (in a repeat) its row's. An error that was
already shown disappears as soon as its field is hidden. Paths no field renders
are always validated, and `address.street` follows the `address` field it
belongs to.

A path needs no corresponding rendered field at all — a cross-field rule like
`endDate` works fine with no UI field behind it. Inside a `repeat`, a
concrete array index becomes a `*` wildcard instead, e.g.
`"items.*.quantity"` — one entry covers every row (see
[Repeated items](#repeated-items) for how that's resolved against the live
model).

`FormEngine` delegates to a `ValidationService` (also exported, independently
usable) that runs a path's rules in order and stops at the first failure — it
has no built-in knowledge of what `"required"` or `"minLength"` mean, it just
looks the `type` up in a validator registry:

```ts
export interface ValidatorContext {
  value: unknown
  rule: ValidationRule
  path: string // the resolved model path being validated — not a FieldDefinition
  translate: TranslationProvider['t']
  isEmpty: boolean
}

export type Validator = (context: ValidatorContext) => ValidationResult
```

Everything a validator could need is bundled into one context object rather
than a fixed positional argument list, so adding something new later (e.g. the
whole `FormEngine`) doesn't change every existing validator's signature. Note
there's deliberately no `field` here — a validator that needed to know about a
specific rendered component would be leaking a rendering concern into a model
concern; a rule's own parameters (like `minLength`'s `value` above) belong on
the rule, not on whatever field happens to render that path.

Only `required` ships built in. Add your own the same way you'd register a
component — note `translate`: **validators must never hardcode user-facing
message text**, they resolve it through `translate(key, params?)` so it stays
localizable. Also note `isEmpty`: **most rules should pass when the value is
empty** — that's what `required` is for, and repeating an empty-value check in
every rule would be redundant and inconsistent (`isEmpty` handles arrays,
booleans, dates, and numbers correctly, not just `""`/`null`/`undefined`):

```ts
import { registerValidator } from '@octarine/form-engine'

registerValidator('minLength', ({ value, rule, isEmpty, translate }) => {
  if (isEmpty) return { valid: true }
  const min = rule.value as number
  const ok = typeof value === 'string' && value.length >= min
  return ok
    ? { valid: true }
    : { valid: false, message: translate('myApp.validation.minLength', { min }) }
})
```

`isEmpty` is derived from `value` (via a getter), not something you or
`FormEngine` compute and pass in separately — a context can't be constructed
with a stale or incorrect `isEmpty`. For the common case of "skip entirely
when empty," wrap the validator instead of repeating the check:

```ts
import { registerValidator, skipWhenEmpty } from '@octarine/form-engine'

registerValidator(
  'minLength',
  skipWhenEmpty(({ value, rule, translate }) => {
    const min = rule.value as number
    const ok = typeof value === 'string' && value.length >= min
    return ok
      ? { valid: true }
      : { valid: false, message: translate('myApp.validation.minLength', { min }) }
  }),
)
```

By default `translate` is `defaultTranslationProvider`, which ships a small
built-in English catalog for this package's own keys (currently just
`formRenderer.validation.required`) and otherwise echoes the key back
unresolved. A host app replaces it with a real integration (e.g. bridging to
vue-i18n) via `provideFormRendererServices({ translationProvider })` —
`FormRenderer.vue` picks that up automatically through `useTranslation()` and
threads it into any `FormEngine` it constructs from a `definition` prop. If
you construct your own `FormEngine` directly, pass the provider as the fourth
constructor argument yourself.

A rule can also carry its own `message`, which overrides the validator's
default:

```ts
validations: {
  otherMunicipality: [{ type: 'required', message: 'Please fill this in.' }]
}
```

For one-off rules scoped to a single form (rather than registered globally),
pass a validator map as the third `FormEngine` constructor argument — it's
merged on top of the global registry for that instance only:

```ts
new FormEngine(definition, model, {
  evenLength: ({ value, isEmpty }) =>
    isEmpty || (typeof value === 'string' && value.length % 2 === 0)
      ? { valid: true }
      : { valid: false },
})
```

`FormRenderer.vue` also accepts a `validators` prop for the same per-instance
override, scoped to a single `<FormRenderer>` the way `components` is.

Validators are synchronous by design — `setValue` runs validation inline and
the result is available immediately after the call returns. Remote/async
validation (e.g. a server-side uniqueness check) is intentionally not
supported yet; it would change `setValue`'s contract and is left as a future
extension rather than something bolted on now.

A field shows its required marker from `formEngine.isRequired(path)`: true when
the path has a `required` rule whose `condition` (if any) holds right now,
evaluated exactly as validation does, in the row's scope inside a `repeat`. So
a required-if field shows `*` only while validation would demand a value:

```ts
:required="formEngine.isRequired(path)"
```

`getValidationResult(path)` returning `undefined` means "no rule is declared
for this path at all" — not "checked and passed." A path that was actually
validated and passed gets `{ valid: true }`; one with no entry in
`validations` never gets a result written in the first place.

## Conditions and expressions

`hide`, `disabled`, and `readonly` on a field, and `condition` on a validation
rule, all share the same `ConditionValue` shape:

```ts
export type ConditionValue =
  boolean | string | { expression: string; root?: boolean; defaultValue?: boolean }
```

A string is a [sandboxjs](https://github.com/nyariv/SandboxJS) expression,
evaluated against the model as the scope — reference any field by name
directly, no `model.` prefix:

```ts
{ type: "text", path: "email", hide: "subscribe !== true" }
```

Sandboxjs runs the expression in a real (allowlisted) JS sandbox — no access
to `window`/`document`/globals, but ordinary JS syntax works (`?.`,
comparisons, template literals). Compiled expressions are cached by string
(`ExpressionService`, also exported), so the same condition string isn't
recompiled on every reactive re-evaluation.

An `age(birthDate)` helper and `env.language` (the current locale) are always
available to expressions:

```ts
{
  hide: 'age(birthDate) < 18'
}
{
  hide: "env.language === 'fr'"
}
```

The object form adds two things a plain string can't: `root: true` forces
evaluation against the whole model rather than whatever narrower scope would
otherwise apply (relevant once repeated/array field types exist — see below),
and `defaultValue` overrides the fallback used if the expression throws.

**Defaults differ by purpose.** `hide`/`disabled`/`readonly` default to
`false` (fail open — a broken condition shows/enables a field rather than
silently locking it away). A validation rule's `condition` defaults to `true`
(fail closed — better to over-validate than let bad data through because of
a broken condition):

```ts
validations: {
  otherMunicipality: [
    { type: "required", condition: "redactionPlace === 'OtherMunicipality'" },
  ],
}
```

Every field's top-level path is guaranteed to exist in the model (as
`undefined` if never set) specifically so conditions can reference _other_
fields safely — `subscribe !== true` works even before `subscribe` has ever
been touched. Referencing something that was never a declared field's path at
all still throws (and falls back to the default), which is deliberate: it
catches a genuine typo rather than silently evaluating to `undefined`.

**What this replaces**: the legacy `_forms` system had a second, separate
condition mechanism (`{path, op, value}` structural comparison, plus yet
another one for validation-only `requiredIf`/`forbiddenIf` conditions) with
inconsistent operator sets between the two. Both are gone — sandboxjs
expressions already express any comparison a structural form could
(`redactionPlace === 'OtherMunicipality'`), just more flexibly, so there's
only one mechanism to learn and maintain.

**Not built yet**: repeated/array field types, and the scope-per-array-item
behavior that goes with them (referencing the current row's own fields
unqualified). `ExpressionService`'s `scope`/`rootScope` split already exists
for this — a future repeated-group field type just passes the row as `scope`
and the form's root model as `rootScope`, no `ExpressionService` changes
needed.

## Localisation

A form's own text lives in its `localisations` block, keyed by locale, with
dotted-path nesting the same way form-model paths use:

```ts
{
  localisations: {
    default: "nl",
    nl: { Button: { Label: "Bewaar", Description: "Klik op {{Button.Label}} om te bewaren" } },
    fr: { Button: { Label: "Enregistrer" } },
  },
}
```

`FormEngine.localise("Button.Label")` (and the `useLocalizedString` composable,
which wraps it in a `computed`) resolves against the active locale — an
explicit `locale` constructor/`FormRenderer` prop, else `localisations.default`,
else `""`. `useLocalizedString` takes a **getter**, not a plain value —
`useLocalizedString(() => props.field.label)`, not
`useLocalizedString(props.field.label)` — so it re-reads the current value on
every recompute rather than capturing it once at call time; that's what lets
a field's label update live if something mutates it after the component's
already mounted (e.g. a WYSIWYG builder's properties panel editing
`field.label` directly). A `{{Other.Key}}` reference inside a resolved string
is itself
resolved against the same table (self-referential, capped at 5 levels deep so
a circular reference can't hang). If the key isn't in the form's own table at
all, resolution falls through to the injected `TranslationProvider` (see
`provideFormRendererServices`), and finally to the raw key itself — so an
unresolved key is never worse than showing the literal text an author wrote.

**Switch/case labels.** A field's `label` (and a select option's `label`) isn't
limited to a plain string — it can be a `LocalisableString`:

```ts
export type LocalisableString = string | Record<string, ConditionValue>
```

An object's keys are candidate localisation keys; each key's value is a
`ConditionValue` (the exact same condition engine `hide`/`disabled` use),
evaluated in object-key order — the first truthy condition wins:

```ts
{
  label: {
    "Concerned.InszChild": "concerned.relation?.type === 'MijnKind'",
    "Concerned.Insz": "concerned.relation?.type !== 'MijnKind'",
  },
}
```

There's no dedicated `default`/`else` key — add a trailing entry whose
condition is the literal `true` for an else-branch, the same convention the
legacy `_forms` system used:

```ts
{ label: { "Buttons.ResendInvitation": "isReminder", "Buttons.SendInvitation": true } }
```

If no branch matches, `localise()` resolves to an empty string (and logs a
dev-mode warning naming the offending object — a deliberate improvement over
the legacy system, which failed the same way but silently). This is a single,
general mechanism on `FormEngine.localise()` itself, not something
`label`-specific — anything routed through it (a field's `label`, a select
option's `label`, or your own component reading some other JSON property
through `useLocalizedString`/`formEngine.localise()`) gets switch/case support
for free.

## Repeated items

A `"repeat"` field renders its `components` once per item of an array field,
each scoped to its own row:

```ts
{
  type: "repeat",
  path: "items",
  components: [
    { type: "text", path: "label" },
    { type: "text", path: "quantity", hide: "type !== 'x'" },
  ],
}
```

A field inside `components` addresses **its own row** — `path: "quantity"`
resolves to `items.0.quantity`, `items.1.quantity`, and so on, computed
automatically by every composable (`useFieldModel`, `useLocalizedString`) and
by `FormComponent`'s own `hide` check. Nothing about the field wrapper itself
changes — it's still just `{ field }`, exactly like a non-repeated field.

**How the row is threaded through**: `FormRepeat` (registered under `"repeat"`
in `@octarine/forms`) renders one `FormRepeatItem` per array
element; each `provide()`s a `RepeatContext` (`{ arrayPath, arrayIndex }`,
already fully resolved) that any descendant — at any depth — reads back with
`useRepeatContext()`. This is a deliberate change from how the legacy `_forms`
system did this (threading `arrayPath`/`arrayIndex` as props through every
intermediate component): several of its list variants forgot to forward them
correctly, so a field several layers deep silently resolved against the wrong
row. With `provide`/`inject`, nothing has to remember to forward anything —
and it composes correctly for **repeats nested inside repeats** for free: an
inner `FormRepeat` just asks `useRepeatContext()` for the outer row, folds its
own field's path in, and re-provides for its own descendants.

**Row-scoped conditions, with nothing to remember at the call site**: a plain
string/`{expression}` condition inside a repeated row evaluates with **that
row's own fields as scope** — `hide: "type !== 'x'"` means _this row's_
`type`, unqualified, the same way the legacy system worked. `{ expression:
"...", root: true }` is the escape hatch back to the whole model (e.g. to
compare a row's field against something elsewhere on the form).

`FormEngine.resolveCondition()`/`localise()` do accept a `RepeatContext` as
their own last argument — but that's for `FormEngine`'s internal recursion
(`validateModel`, `localise`'s own switch/case resolution) and for tests, not
for components. `useFormEngine()` is the one place ambient context gets
resolved: inside a repeated row it transparently returns a wrapped engine
whose `resolveCondition(condition)`/`localise(key)` already close over the
current `RepeatContext`, so every call site — a field wrapper's `:disabled`,
`FormComponent`'s own `hide` check — stays the exact same two-argument call it
would be outside a repeat. There's no third argument to remember to thread
through, and no bug class where some component forgot to forward it (the
single worst inconsistency in the legacy system, which threaded
`arrayPath`/`arrayIndex` through as props and had several list variants forget
to pass them on correctly).

Validation works the same way, but it's resolved differently — see
[Validation](#validation): rules for a repeated field live at
`definition.validations["items.*.quantity"]`, not on the field itself, and
`FormEngine` expands that wildcard against the live model (checking which
segments are genuinely array indices) rather than walking `components` at
all. A `requiredIf`-style rule's own `condition` still sees the row, not the
root model — `ValidationService.validate()` takes the same `scope`/
`rootScope` split `resolveCondition` does — but the _reason_ it works is that
validation and rendering now derive row-scoping from the same place (the
live model), not that one copies the other's logic. (The legacy system's
other confirmed inconsistency: its UI conditions were row-scoped but its
validation conditions were not, silently — this structurally rules that out.)

**Add/remove** always goes through `FormEngine.addRepeatItem(path, item?)` /
`removeRepeatItem(path, index)` — both re-run `validateModel()` afterward,
since every row's index (and therefore its validation-result key) shifts on
add/remove. `FormRepeat`'s default "Add"/"Remove" buttons build a
well-declared default item via the exported `declareFieldKeys` helper, so a
freshly-added row's fields are declared (if `undefined`) rather than missing
entirely — the same reasoning as `FormEngine`'s own top-level field
declaration, just applied per-row.

**Deliberately not carried over from legacy**: `lengthProperty`/`maxCount`
(a separate numeric field auto-resizing the array, with a hard cap) — no
current form needs it, and it's straightforward to add on top of
`addRepeatItem`/`removeRepeatItem` later if one does. Rows are keyed by array
index (`v-for :key="index"`), matching most of the legacy list variants —
reordering/removing mid-edit can shift what a still-open reference (e.g. a
captured index in an async callback) points to; stable per-item ids are a
future option if that turns out to matter in practice.

## Lists

A field's `options` can be an inline array, or a **string naming a list**:

```ts
{ type: "select", path: "country", options: "countries" }
```

Resolution is two-tier: check the form's own `lists` map first (embedded
directly in the form JSON, e.g. `{ lists: { countries: [...] } }`), then fall
back to an injectable `ListProvider` — the same "leave it open" shape as
`TranslationProvider`:

```ts
export interface ListProvider {
  getList(name: string): Promise<unknown[]> | unknown[]
}
```

A list's items are **arbitrary objects** — this package has no opinion on
their shape. Mapping them to whatever a control needs (e.g. `{label, value}`
for a select) is the field component's job, the same way `SelectField` does
it — not something `FormEngine`/`ListService` do for you.

Because a `ListProvider` may do a real network call, list resolution is
reactive and can start empty — this is the one place in the engine that isn't
synchronous end-to-end. The `useResolvedList(field)` composable handles this:
an inline array resolves immediately, a string name starts as `[]` and updates
once `formEngine.getList(name)` resolves.

```ts
import { provideFormRendererServices } from '@octarine/form-engine'

provideFormRendererServices({
  listProvider: {
    getList: async (name) => (await fetch(`/api/lists/${name}`)).json(),
  },
})
```

No provider configured (the default) means only form-local `lists` work —
a string name with no match anywhere resolves to `[]`, not an error.

Not supported yet: `optionsFilter`-style dynamic filtering of a resolved list
against the current model — that needs the same expression-evaluator
machinery as the `hide`/`disabled` conditions deferred from the very start of
this rebuild.

## Defaults and constants

Both seed the model, shaped exactly like the model itself (a nested object,
not dotted paths):

```ts
{
  defaults: { firstName: "Ada", address: { city: "Ghent" } },
  constants: { requestType: "renewal" },
}
```

The difference is _when_ each applies:

- **`defaults`** seed the model only when it's constructed empty — re-opening
  an in-progress form with real saved data leaves it alone.
- **`constants`** seed the model unconditionally, whether the model is fresh
  or being re-opened.

Either way, a real value passed in as the initial model always wins over
both. Removing a value (`formEngine.removeValue(path)`) restores its default
if one is configured, rather than leaving the field truly empty — constants
are deliberately not restored here, matching the legacy `_forms` system,
since they're not expected to be user-editable in the first place (next
paragraph).

**The server is the actual authority that a constant doesn't change** —
`FormEngine` doesn't enforce that client-side, it just seeds the value. What
it does add is `isConstant(path): boolean`, so a constant-backed field can be
made non-editable automatically rather than letting a user edit something
that'll be silently discarded server-side:

```ts
:disabled="formEngine.resolveCondition(field.disabled) || formEngine.isConstant(path)"
```

Every field in `@octarine/forms` will do this.
