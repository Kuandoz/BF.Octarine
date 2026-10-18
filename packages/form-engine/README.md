# @octarine/form-engine

Headless Vue engine for rendering a form from a JSON definition. It owns the reactive
model, what was touched and submitted, error messages, and the recursive rendering pipeline; the
rules themselves run in [`@octarine/form-core`](../form-core), the same code the server runs.
It ships with **no concrete field components**: those come from [`@octarine/forms`](../forms) (planned) or
from your own components, wired in as described below.

Everything form-core and [`@octarine/form-abstractions`](../form-abstractions) export (the
types, `validateSubmission`, `defineValidator`, `jsLanguage`, …) is exported from here too, so an
app needs only this package.

## Quick start

A form is JSON: the fields to show, and the rules for the values, kept apart.

```ts
import type { FormDefinition } from '@octarine/form-engine'

export const contact: FormDefinition = {
  components: [
    { type: 'text', path: 'name', label: 'Name' },
    { type: 'checkbox', path: 'wantsCall', label: 'Call me back' },
    { type: 'text', path: 'phone', label: 'Phone', hide: 'wantsCall !== true' },
  ],
  validations: {
    name: [{ type: 'required' }],
    phone: [{ type: 'required', condition: 'wantsCall === true' }, { type: 'phone' }],
  },
}
```

Set up the field types once (see [`useField`](#usefield) for writing one):

```ts
// main.ts
import { createForms, defineField } from '@octarine/form-engine'
import '@octarine/form-engine/layout.css'
import { CheckboxField, TextField } from './fields'

const forms = createForms({
  fields: [
    defineField({ type: 'text', component: TextField }),
    defineField({ type: 'checkbox', component: CheckboxField }),
  ],
})
app.use(forms)
```

Then render a form:

```vue
<script setup lang="ts">
import { FormRenderer, useForm } from '@octarine/form-engine'
import { contact } from './contact'

const form = useForm(contact)
</script>

<template>
  <FormRenderer :form="form" @submit="send">
    <button type="submit">Send</button>
  </FormRenderer>
</template>
```

The engine has no styling and no field components of its own. Storybook's **Forms/Form engine**
page shows it working with Octarine's components.

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

Nothing is assumed about how the component looks or what UI library backs it.

### `useField`

`useField` is the one composable a field component needs. Pass it the `field`
prop as a getter, so an edited definition (in a builder) shows up right away:

```vue
<script setup lang="ts">
import { useField } from '@octarine/form-engine'
import type { FieldDefinition } from '@octarine/form-engine'

const props = defineProps<{ field: FieldDefinition }>()
const { id, value, label, hint, required, disabled, readonly, error, onBlur, attrs } =
  useField<string>(() => props.field)
</script>

<template>
  <label :for="id">{{ label }}<span v-if="required"> (required)</span></label>
  <input
    :id="id"
    v-model="value"
    v-bind="attrs"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :aria-invalid="error ? true : undefined"
    @blur="onBlur"
  />
  <p v-if="error">{{ error }}</p>
</template>
```

| Returns    | What it is                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | An id for the control, from Vue's `useId()`. Unique per mounted field, so two forms that capture the same path don't clash.     |
| `path`     | The path resolved against the row the field is in (`items.2.quantity`).                                                         |
| `value`    | Reads and writes the value at `path`.                                                                                           |
| `label`    | `field.label`, localised. `hint` likewise, or `undefined`.                                                                      |
| `required` | Whether validation demands a value right now, following required-if conditions.                                                 |
| `disabled` | The `disabled` condition, evaluated; also true for a constant. `readonly` likewise.                                             |
| `error`    | The error to show now: after the field was left, or after a submit.                                                             |
| `onBlur`   | Call it when the user leaves the field; from then on its error shows.                                                           |
| `attrs`    | The field's own settings (`maxLength`, `options`, ...): every property the engine doesn't read itself. For the control's props. |

`attrs` leaves out what the engine reads (`type`, `path`, `components`, `label`,
`hint`, `layout`, `labelBadge`, `hide`, `disabled`, `readonly`): a `disabled`
condition like `"locked === true"` isn't an HTML attribute.

`useField` registers `id` with the engine for its path, so an error summary can
link to the control (see [Showing errors](#showing-errors)). A group that only
frames its children, like a fieldset, has no control for that id: it calls
`useField(() => props.field, { target: false })`, and errors on its path link to
its first control instead.

Ids come from `useId()`, so they are unique within one Vue app. A page that
mounts **several Vue apps** gives each its own `app.config.idPrefix`.

`useFormEngine()` returns the engine of the form the component is in. It
throws if called outside a `FormRenderer`'s subtree — a clear failure the first
time a component is mounted standalone (Storybook, an isolated test), rather
than a silent `undefined`. In a test, provide a `FormEngine` yourself using the
exported `FORM_ENGINE_KEY`, e.g. with `@vue/test-utils`:

```ts
import { FORM_ENGINE_KEY } from '@octarine/form-engine'

mount(MyField, {
  props: { field },
  global: { provide: { [FORM_ENGINE_KEY]: engine } },
})
```

## Setting up: `createForms`

`createForms` sets up the forms of an app: the field types they render, and
what every form shares. `app.use(forms)` makes it the setup of every component
below.

```ts
const forms = createForms({
  fields: [textField, checkboxField, repeatField],
  validators: { iban, workingDays }, // added to the built-in ones
  functions: { workingDays }, // for expressions, besides age()
  expressionLanguages: [feelLanguage], // besides 'js'
  lists: { getList: async (name) => (await fetch(`/api/lists/${name}`)).json() },
  translate: (key, params) => i18n.global.t(key, params),
})
```

| Option                | What it does                                                                          |
| --------------------- | ------------------------------------------------------------------------------------- |
| `fields`              | The field types, from `defineField`.                                                  |
| `validators`          | Validators for every form, added to the built-in ones (same name replaces one).       |
| `functions`           | Functions expressions can call, besides `age()`.                                      |
| `expressionLanguages` | Languages a form can name in `definition.expressions`, besides `js`.                  |
| `repeatTypes`         | More field types with rows (`defineField({ rows: true })` adds them already).         |
| `lists`               | A `ListProvider` for named lists a form doesn't define itself.                        |
| `translate`           | Puts a message key and its parameters into words. Default: English for the built-ins. |

There are no global registries: two setups (two apps, or a test next to an
app) share nothing. Without an installed setup, a form has no field types and
only the built-in rules.

**The rules are shared with the server.** `validators`, `functions`,
`expressionLanguages` and `repeatTypes` have the same shape as the options of
form-core's `validateSubmission`, so they belong in one module both import. A
validator the server doesn't know lets anything through there.

```ts
// rules.ts, imported by the app and by the form service
export const rules = { validators: { iban }, functions: { workingDays } }

createForms({ ...rules, fields }) // the app
validateSubmission(definition, model, rules) // the server
```

### Field types: `defineField`

A field type is a component with the contract above, under the `type` string a
definition uses:

```ts
defineField({
  type: 'text',
  component: TextField,
  // The field's own properties, for editors and the definition schema.
  schema: { properties: { maxLength: { type: 'integer', minimum: 1 } } },
})
defineField({ type: 'travellers', component: TravellersField, rows: true })
```

`rows: true` says the field's `components` are the fields of each row, as for
the built-in `repeat` type: paths inside it are relative to the row, and
labels, screen order and `isHidden` follow the rows. Any form JSON with
`{ type: "travellers", path: "people" }` then renders it, with no changes to
`FormRenderer` or `FormComponent`. A type nobody declared logs a warning and
renders nothing.

### Validators: `defineValidator`

A plain function is a validator. `defineValidator` also says which parameters
its rule takes, the same way a field type does:

```ts
const workingDays = defineValidator({
  schema: { properties: { max: { type: 'integer' } }, required: ['max'] },
  validate: ({ value, rule }) => ({
    valid: countWorkingDays(value) <= Number(rule.max),
    key: 'myApp.workingDays',
    params: { max: rule.max },
  }),
})
```

The built-in validators (`builtInValidators`) declare theirs too.

## The form

`useForm(definition, options)` makes a form with the app's setup, and
`<FormRenderer :form>` renders it:

```vue
<script setup lang="ts">
const props = defineProps<{ definition: FormDefinition; saved?: Record<string, unknown> }>()
const form = useForm(() => props.definition, {
  model: () => props.saved,
  locale: () => i18n.locale.value,
  validators: { onlyHere }, // added to the app's, for this form only
})
</script>

<template>
  <FormRenderer :form="form" aria-label="Contact details" @submit="send" @invalid="show">
    <template #before="{ engine }">
      <!-- e.g. an error summary -->
    </template>
    <OButton type="submit">Send</OButton>
  </FormRenderer>
</template>
```

Pass refs or getters to follow changes:

- a changed **definition** (a new object, or edits inside it, as in a builder's
  preview) makes a new engine that keeps the values filled in so far;
- a changed **model** starts over with those values;
- a changed **locale** switches the language in place; what was filled in stays.

The definition and the model are compared by content, so a template that
builds them inline (`:model="{}"`) doesn't reset the form on every render.
Because a change can replace the engine, `useForm` returns a ref:
`form.value.submit()` in a script, `:form="form"` in a template.

**The app's model is never changed.** The engine works on a copy; read the
values from `form.value.model`, or from the `submit` event, which gets a plain
copy.

`FormRenderer` renders a `<form novalidate>`: the engine validates, not the
browser. Sending it (a submit button, Enter in a field) calls `engine.submit()`
and emits either `submit`, with a plain copy of the values, or `invalid`, with
the errors in screen order. Attributes like `aria-label` or `class` go to the
`<form>`. The `before` slot sits above the fields and the default slot below
them; both get the `engine`. The component also exposes `engine` and
`submit()`, for a button outside the form.

**Unsaved changes.** `engine.dirty` tells whether the values differ from the
pristine ones (what the form started with), `engine.isDirty(path)` the same for
one path. Empty values (`''`, `[]`, `{}`) count as no value, so typing and
clearing a field, or adding a row and removing it, is no change. After saving,
`engine.markPristine()` makes the current values the pristine ones;
`engine.reset()` goes back to them and hides errors again until the next blur
or submit.

For a quick form, `FormRenderer` also takes `definition`, `model` and `locale`
props and calls `useForm` itself.

Without Vue's setup (a test, a script), `forms.createEngine(definition, options)`
or `new FormEngine(definition, { model, locale, fields, validators, … })` makes
an engine directly.

## Layout

Fields sit in a six-column grid. A field asks for a share of a row with
`layout: { width: "half" }` or `"third"`; anything else is full width.

```ts
import '@octarine/form-engine/layout.css'
```

The engine only marks the markup (`data-form-grid`, `data-form-item`,
`data-width`); `layout.css` places the cells. Half and third widths apply only
when the form itself is wide enough (30rem for halves, 40rem for thirds, measured
with a container query); below that every field takes the full width, so a
form reflows on a phone or when zoomed in, without scrolling sideways (WCAG
1.4.10). The gaps come from `--oct-form-row-gap` and `--oct-form-column-gap`,
with fallbacks of 1.5rem and 1rem.

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

**When errors are shown.** A value is validated as it changes, but its error
only appears once the user has left the field or tried to submit, so nobody is
told "invalid email" after one letter. Fields call `engine.touch(path)` on blur
and show `engine.getError(path)`; a submit button calls `engine.submit()`, which
validates every visible field, shows all errors and returns whether the form can
be sent. A shown error follows the value and disappears once it is fixed. A change re-runs
every rule, so a rule that depends on another field (a required-if, a `compare`) is never out of
date.
`getValidationResult(path)` still returns the raw result at any time.

**Hidden fields are validated too.** A value can't slip through by hiding its
field, whether it was tampered with or set behind the scenes. `hide` and
`required` are independent, so a form that asks for a value only while its
field is shown says so with a rule condition:

```ts
components: [
  { type: "checkbox", path: "wantsCall" },
  { type: "text", path: "phone", hide: "wantsCall !== true" },
],
validations: {
  phone: [{ type: "required", condition: "wantsCall === true" }, { type: "phone" }],
},
```

`engine.isHidden(path)` tells whether every field that shows a path is hidden,
by its own `hide`, a container's, or (in a repeat) its row's. `FormComponent`
leaves a field out with the same check, so what is on screen and what the engine
reports can't disagree. Paths no field renders are never hidden, and
`address.street` follows the `address` field it belongs to.

**Fields the person can't change don't show errors.** A disabled or read-only
field (by its own condition or a container's) and a constant are validated like
any other, but `getError` shows nothing for them and `submit()` doesn't fail on
them: the person couldn't fix it. The server checks them anyway, and doesn't take
their values from the client. `engine.isLocked(path)` tells whether a path is one
of them.

### Showing errors

`engine.getErrors()` lists every error that shows right now, in the order the
fields appear on screen, for an error summary such as `OErrorSummary`:

```ts
interface FormError {
  path: string
  message: string
  label: string // the field's label, localised; '' when no field renders the path
  target?: string // id of the control to jump to
}
```

`target` is the id of the control `useField` mounted for the path (the first one,
if several fields show it). An error on a group (`address`, `items`) without a
control of its own targets the group's first control; a repeat can register its
Add button for its own path instead. A hidden field has no target: there is
nothing on screen to jump to, so the summary entry needs the `label` to say what
it is about.

An error on a group follows the values inside it: changing `address.city`
re-runs the rules on `address`.

A path needs no corresponding rendered field at all — a cross-field rule like
`endDate` works fine with no UI field behind it. Inside a `repeat`, a
concrete array index becomes a `*` wildcard instead, e.g.
`"items.*.quantity"` — one entry covers every row (see
[Repeated items](#repeated-items) for how that's resolved against the live
model).

The rules run in [`@octarine/form-core`](../form-core), which has no Vue, so the
server runs exactly the same checks with `validateSubmission`. The engine calls
form-core's `FormValidator` over its reactive model and keeps the results. A
path's rules run in order and stop at the first failure. form-core has no
built-in knowledge of what `"required"` or `"minLength"` mean; it looks the
`type` up in a validator registry:

```ts
export interface ValidatorContext {
  value: unknown
  rule: ValidationRule
  path: string // the resolved model path being validated — not a FieldDefinition
  isEmpty: boolean
  scope: Record<string, unknown> // the row inside a repeat, else the model
}

export interface ValidatorResult {
  valid: boolean
  key?: string // the message key; the generic "isn't valid" one when left out
  params?: Record<string, unknown> // fills in the message: { min: 3 }
}

export type Validator = (context: ValidatorContext) => ValidatorResult
```

Everything a validator could need is bundled into one context object rather
than a fixed positional argument list, so adding something new later doesn't
change every existing validator's signature. Note there's deliberately no
`field` here — a validator that needed to know about a specific rendered
component would be leaking a rendering concern into a model concern; a rule's
own parameters (like `minLength`'s `value` above) belong on the rule, not on
whatever field happens to render that path.

**A validator returns a message key, never text.** The result
(`{ valid: false, rule, key, params }`) is what the server sends back too;
text is made where it is shown, in the reader's language. Also note `isEmpty`:
**most rules should pass when the value is empty** — that's what `required` is
for (`isEmpty` handles arrays, booleans, dates, and numbers correctly, not just
`""`/`null`/`undefined`):

```ts
import type { Validator } from '@octarine/form-engine'

export const minWords: Validator = ({ value, rule, isEmpty }) => {
  if (isEmpty) return { valid: true }
  const min = Number(rule.value)
  const ok = String(value).trim().split(/s+/).length >= min
  return ok ? { valid: true } : { valid: false, key: 'myApp.validation.minWords', params: { min } }
}

createForms({ validators: { minWords }, fields })
```

`isEmpty` is derived from `value` (via a getter), not something you or
`FormEngine` compute and pass in separately — a context can't be constructed
with a stale or incorrect `isEmpty`. For the common case of "skip entirely
when empty," wrap the validator instead of repeating the check:

```ts
import { skipWhenEmpty } from '@octarine/form-engine'

export const even = skipWhenEmpty(({ value }) => ({
  valid: Number(value) % 2 === 0,
  key: 'myApp.validation.even',
}))
```

A validator the server doesn't know lets anything through there, so keep
custom validators in a module that the app and the server both import (see
[`createForms`](#setting-up-createforms)).

`engine.getError(path)` puts a result into words with `translate` (see
[`createForms`](#setting-up-createforms)). By default that ships English text
for the built-in validators' keys (`formRenderer.validation.required`, …) and
otherwise echoes the key back.

A rule can also carry its own `message`, which wins over the validator's key.
It is localised like a label: a key in the form's `localisations`, or literal
text:

```ts
validations: {
  otherMunicipality: [{ type: 'required', message: 'Municipality.Required' }]
}
```

For rules of a single form, pass `validators` to `useForm` (or
`createEngine`); they are added to the app's for that form only.

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

A string is an expression in the form's [expression language](#expression-languages),
`js` by default, evaluated against the model as the scope — reference any
field by name directly, no `model.` prefix:

```ts
{ type: "text", path: "email", hide: "subscribe !== true" }
```

The `js` language is JS expression syntax, parsed by
[subscript](https://github.com/dy/subscript) and evaluated by the engine:

- comparisons (`===`, `!==`, `==`, `<`, …), `&&`, `||`, `!`, `??`, `? :`,
  arithmetic, `typeof`, parentheses, string/number/boolean/`null` literals and
  arrays;
- reading fields (`contact.mode`, `items[0].name`, `items.length`, `?.`);
- calling the form's functions (`age(birthDate)`) and a few methods:
  `includes`, `startsWith`, `endsWith`, `toLowerCase`, `toUpperCase`, `trim`
  on strings, and `includes`, `indexOf`, `join` on arrays.

It can't assign, define functions, or reach anything outside its scope.
Properties are read from plain data only (own properties of objects, indexes
and `length` of arrays and strings), so `constructor`, `__proto__` and globals
are out of reach, and functions stored in the model can't be called.

One difference from JS: reading a property of a missing value gives `undefined`
instead of throwing, so `contact.address.city === 'Ghent'` works before
`address` was filled in. A name that is neither a field, `env` nor a function
still fails (and falls back to the default), so a typo is reported.

Compiled expressions are cached by source, so the same condition isn't parsed
again on every reactive re-evaluation. `jsLanguage.compile(source)` also lists
the model paths an expression reads (`dependencies`), for editors and the
builder.

An `age(birthDate)` helper and `env.language` (the current locale) are always
available to expressions; `createForms({ functions })` adds more:

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

### Expression languages

Expressions are evaluated by an `ExpressionLanguage`, so the language can be
swapped. A form names the one it is written in, `"js"` by default:

```json
{ "expressions": "feel", "components": [...] }
```

A language only parses and evaluates:

```ts
interface ExpressionLanguage {
  name: string // what a form names in `expressions`
  compile(source: string): CompiledExpression // throws an ExpressionError
}

interface CompiledExpression {
  evaluate(context: { scope; env; functions }): unknown
  dependencies?: readonly string[] // model paths it reads, for editors
}
```

Everything else is the engine's and works the same in every language: the
scope (the row inside a repeat, the whole model with `root: true`), the
functions an expression can call (`age()`), `env`, the fallbacks when an
expression fails, and caching compiled expressions by source.

Add languages with `createForms({ expressionLanguages: [feelLanguage] })`; one
named `"js"` replaces the built-in one.

A form that names a language nobody registered fails when its `FormEngine` is
created, instead of quietly falling back on every condition.

`_forms` system had a second, separate
condition mechanism (`{path, op, value}` structural comparison, plus yet
another one for validation-only `requiredIf`/`forbiddenIf` conditions) with
inconsistent operator sets between the two. Both are gone — expressions already express any comparison a structural form could
(`redactionPlace === 'OtherMunicipality'`), just more flexibly, so there's
only one mechanism to learn and maintain.

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
explicit `locale` option (or `engine.setLocale()` later), else `localisations.default`,
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
all, resolution falls through to `translate` (see
[`createForms`](#setting-up-createforms)), and finally to the raw key itself — so an
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
automatically by every composable (`useField`, `useLocalizedString`) and
by `FormComponent`'s own `hide` check. Nothing about the field wrapper itself
changes — it's still just `{ field }`, exactly like a non-repeated field.

**`FormRows`** renders the rows. A repeat component (`defineField({ type:
'repeat', component, rows: true })`, or any type with `rows: true`) only adds
how it looks and the Add/Remove buttons:

```vue
<script setup lang="ts">
import { FormComponent, FormRows, useField, useFormEngine } from '@octarine/form-engine'
import type { FieldDefinition } from '@octarine/form-engine'

const props = defineProps<{ field: FieldDefinition }>()
const engine = useFormEngine()
// The Add button is the summary target for errors on the list itself.
const { id, path, label } = useField(() => props.field)
</script>

<template>
  <fieldset>
    <legend>{{ label }}</legend>
    <FormRows :field="field" v-slot="{ index, components, remove }">
      <FormComponent :components="components" />
      <button type="button" @click="remove">Remove item {{ index + 1 }}</button>
    </FormRows>
    <button :id="id" type="button" @click="engine.addRepeatItem(path)">Add</button>
  </fieldset>
</template>
```

Without a slot, each row renders the field's `components`. The slot gets the
row's `index`, its `path` (`items.2`), the `components` and `remove`.

**How the row is threaded through**: `FormRows` renders one row per array
element; each `provide()`s a `RepeatContext` (`{ arrayPath, arrayIndex }`,
already fully resolved) that any descendant — at any depth — reads back with
`useRepeatContext()`. This is a deliberate change from how the legacy `_forms`
system did this (threading `arrayPath`/`arrayIndex` as props through every
intermediate component): several of its list variants forgot to forward them
correctly, so a field several layers deep silently resolved against the wrong
row. With `provide`/`inject`, nothing has to remember to forward anything —
and it composes correctly for **repeats nested inside repeats** for free: an
inner `FormRows` asks `useRepeatContext()` for the outer row, folds its own
field's path in, and re-provides for its own descendants.

**Row-scoped conditions, with nothing to remember at the call site**: a plain
string/`{expression}` condition inside a repeated row evaluates with **that
row's own fields as scope** — `hide: "type !== 'x'"` means _this row's_
`type`, unqualified, the same way the legacy system worked. `{ expression:
"...", root: true }` is the escape hatch back to the whole model (e.g. to
compare a row's field against something elsewhere on the form).

**The row is explicit.** `useFormEngine()` returns the engine itself, not
one scoped to the row. `resolveCondition()` and `localise()` take the row as
their last argument, and a component inside a row passes
`useRepeatContext()`:

```ts
const engine = useFormEngine()
const row = useRepeatContext()
const locked = computed(() => engine.resolveCondition(props.field.locked, false, row))
```

`useField`, `useLocalizedString` and `FormComponent` already do this, so a
field built on `useField` never has to.

Validation works the same way, but it's resolved differently — see
[Validation](#validation): rules for a repeated field live at
`definition.validations["items.*.quantity"]`, not on the field itself, and
form-core's `FormValidator` expands that wildcard against the live model (checking which
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
add/remove. A repeat's Add button can build a well-declared default item
with the exported `declareFieldKeys` helper, so a freshly-added row's fields
are declared (if `undefined`) rather than missing entirely — the same
reasoning as `FormEngine`'s own top-level field declaration, just applied
per-row.

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
createForms({
  lists: { getList: async (name) => (await fetch(`/api/lists/${name}`)).json() },
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

`useField`'s `disabled` is true for a constant, so a field built on it does
this already.
