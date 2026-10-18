import { reactive, ref, shallowRef } from 'vue'

import {
  collectFields,
  collectHideConditions,
  collectLockConditions,
  declareFieldKeys,
  DEFAULT_REPEAT_TYPES,
  defaultListProvider,
  defaultTranslationProvider,
  findClosest,
  FormValidator,
  type FormValidatorOptions,
  getProperty,
  type FieldCondition,
  builtInValidators,
  INVALID_KEY,
  UNAVAILABLE_KEY,
  isEmpty,
  ListService,
  LocalisationService,
  type PathContext,
  removeProperty,
  resolvePathContext,
  setProperty,
} from '@octarine/form-core'

import type { FieldType } from './fields'
import { clonePlain, mergeDeep } from './mergeDeep'
import type {
  ConditionValue,
  FieldDefinition,
  FormDefinition,
  FormError,
  ListProvider,
  LocalisableString,
  RepeatContext,
  TranslationProvider,
  ValidationPending,
  ValidationResult,
  Validator,
  ValidatorContext,
  ValidatorResult,
} from './types'

interface AsyncAnswer {
  key: string
  promise: Promise<ValidatorResult>
  result?: ValidatorResult
  // The check couldn't run; submit() asks again.
  failed: boolean
}

const isPendingResult = (result: ValidationResult): result is ValidationPending =>
  result.valid === false && result.pending === true

const isPromise = (value: unknown): value is Promise<ValidatorResult> =>
  typeof (value as Promise<unknown> | null)?.then === 'function'

// What counts for dirty state: empty values ('', [], {}, null) are all the
// same as no value, so typing text and clearing it, or adding a row and
// removing it, is not a change.
function contentOf(value: unknown): string {
  const normalise = (item: unknown): unknown => {
    if (isEmpty(item)) return undefined
    if (Array.isArray(item)) return item.map(normalise)
    if (item !== null && typeof item === 'object' && !(item instanceof Date)) {
      const entries = Object.entries(item).map(([key, inner]) => [key, normalise(inner)] as const)
      const kept = entries.filter(([, inner]) => inner !== undefined)
      return kept.length ? Object.fromEntries(kept) : undefined
    }
    return item
  }
  return JSON.stringify(normalise(value) ?? null)
}

export interface FormEngineOptions extends FormValidatorOptions {
  // The values to start from. The engine works on a copy: this object is
  // never changed. Read the values from `engine.model`, or from the
  // FormRenderer's `submit` event.
  model?: Record<string, unknown>
  // The language to show; default: the form's `localisations.default`.
  locale?: string
  // Puts a message key and its parameters into words. Default: English text
  // for the built-in validators' keys.
  translate?: TranslationProvider['t']
  // Named lists a form uses without defining them itself.
  lists?: ListProvider
  // The field types the form can render, by `type`.
  fields?: Readonly<Record<string, FieldType>>
}

// The Vue side of a form: the reactive model, what was touched and
// submitted, and errors put into words. The rules themselves run in
// form-core's FormValidator, the same code the server runs; Vue tracks the
// model reads inside it, so results stay reactive without a second
// implementation.
export class FormEngine {
  readonly definition: FormDefinition

  private _model: Record<string, unknown>
  private _validationResults: Record<string, ValidationResult> = reactive({})
  // The values `dirty` compares with: what the form started with, or what
  // markPristine() saw last.
  private _pristine = shallowRef<Record<string, unknown>>({})
  private _touchedPaths = reactive(new Set<string>())
  private _submitted = ref(false)
  private _submitting = ref(false)
  // The last answer of each async rule, per path: reused while the value is
  // the same, so a change elsewhere doesn't ask the server again.
  private _asyncAnswers = new Map<string, AsyncAnswer>()
  private _translate: TranslationProvider['t']
  private _fieldTypes: Readonly<Record<string, FieldType>>
  private _validator: FormValidator
  private _localisationService: LocalisationService
  private _listService: ListService
  private _defaults: Record<string, unknown>
  private _constants: Record<string, unknown>
  private _hideConditions: Map<string, FieldCondition[][]>
  private _lockConditions: Map<string, FieldCondition[][]>
  private _fieldsByPath: Map<string, FieldDefinition>
  // The ids of the mounted controls for each path, in the order they were
  // mounted. Filled by useField.
  private _fieldIds = reactive(new Map<string, string[]>())
  private _locale = ref('')

  constructor(definition: FormDefinition, options: FormEngineOptions = {}) {
    const {
      model: initialModel = {},
      locale,
      translate = defaultTranslationProvider.t,
      lists = defaultListProvider,
      fields = {},
      ...rules
    } = options
    // `repeat` always has rows; field types declared with `rows: true` too.
    const repeatTypes = [
      ...new Set([
        ...DEFAULT_REPEAT_TYPES,
        ...Object.values(fields)
          .filter((field) => field.rows)
          .map((field) => field.type),
        ...(rules.repeatTypes ?? []),
      ]),
    ]

    this.definition = definition
    this._defaults = definition.defaults ?? {}
    this._translate = translate
    this._fieldTypes = fields
    this._constants = definition.constants ?? {}

    const isEmptyModel = Object.keys(initialModel).length === 0
    const seeded: Record<string, unknown> = {}
    mergeDeep(seeded, this._constants)
    if (isEmptyModel) mergeDeep(seeded, this._defaults)
    mergeDeep(seeded, initialModel)
    declareFieldKeys(definition.components, seeded, repeatTypes)
    this._model = reactive(seeded)
    this._pristine.value = clonePlain(seeded)

    const validators = Object.fromEntries(
      Object.entries({ ...builtInValidators, ...rules.validators }).map(([type, validator]) => [
        type,
        this.rememberAnswers(type, validator),
      ]),
    )
    this._validator = new FormValidator(definition, { ...rules, validators, repeatTypes })
    this._localisationService = new LocalisationService(definition.localisations, locale, {
      t: translate,
    })
    this._listService = new ListService(definition.lists, lists)
    this._hideConditions = collectHideConditions(definition.components, repeatTypes)
    this._lockConditions = collectLockConditions(definition.components, repeatTypes)
    this._fieldsByPath = collectFields(definition.components, repeatTypes)
    this._locale.value = this._localisationService.locale
  }

  get locale(): string {
    return this._locale.value
  }

  // Switches the language labels and messages are shown in, keeping
  // everything that was filled in. `undefined` goes back to the form's
  // default.
  setLocale(locale: string | undefined): void {
    this._localisationService.setLocale(locale)
    this._locale.value = this._localisationService.locale
  }

  get model(): Record<string, unknown> {
    return this._model
  }

  getValue(path: string): unknown {
    return getProperty(this._model, path)
  }

  setValue(path: string, value: unknown): void {
    setProperty(this._model, path, value)
    // Every rule runs again, not just those on `path`: a required-if or a
    // compare on another field can depend on this value. Errors still only
    // show for fields that were left, or after a submit.
    this.validateModel()
  }

  removeValue(path: string): void {
    removeProperty(this._model, path)

    const defaultValue = getProperty(this._defaults, path)
    if (defaultValue !== undefined) setProperty(this._model, path, defaultValue)
  }

  // The user has left the field at `path`: validate it, and from now on
  // show its error (see getError). Fields call this on blur.
  touch(path: string): void {
    this._touchedPaths.add(path)
    this.revalidate(path)
  }

  isTouched(path: string): boolean {
    return this._touchedPaths.has(path)
  }

  // Validates every field and shows all their errors. Returns whether the
  // form can be sent: a rule that fails on a value the person can't change
  // (see isLocked) doesn't stop them, because they couldn't fix it. The
  // server checks it anyway.
  //
  // An async rule (one the server checks) is waited for, so the answer is
  // `false` until every check is in. A check that couldn't run is tried
  // again on every submit.
  async submit(): Promise<boolean> {
    this._submitted.value = true
    this._submitting.value = true
    try {
      for (const [slot, answer] of this._asyncAnswers) {
        if (answer.failed) this._asyncAnswers.delete(slot)
      }
      this.validateModel()
      for (;;) {
        const waiting = Object.values(this._validationResults).filter(isPendingResult)
        if (!waiting.length) break
        await Promise.all(waiting.map((result) => result.settled))
        this.validateModel()
      }
      return Object.entries(this._validationResults).every(
        ([path, result]) => result.valid || this.isLocked(path),
      )
    } finally {
      this._submitting.value = false
    }
  }

  // True while submit() waits for async rules: a submit button can say so,
  // and a second submit is ignored by FormRenderer.
  get submitting(): boolean {
    return this._submitting.value
  }

  // Whether an async rule on `path` is still being checked.
  isPending(path: string): boolean {
    const result = this._validationResults[path]
    return result !== undefined && isPendingResult(result)
  }

  // Whether any async rule is still being checked.
  get pending(): boolean {
    return Object.keys(this._validationResults).some((path) => this.isPending(path))
  }

  get submitted(): boolean {
    return this._submitted.value
  }

  // The error to show for `path`, if any. A value is validated as it
  // changes, but its error only appears once the field was left or a submit
  // was attempted, so nobody is told "invalid email" after typing one letter.
  // Once shown, it follows the value and disappears as soon as it is fixed.
  // A value the person can't change (see isLocked) never shows an error.
  getError(path: string): string | undefined {
    if (!this._submitted.value && !this._touchedPaths.has(path)) return undefined
    if (this.isLocked(path)) return undefined
    const result = this.getValidationResult(path)
    // A rule still being checked shows nothing until the answer is in.
    if (!result || result.valid || result.pending) return undefined
    // A rule's own message is the form's text (a localisation key or
    // literal); otherwise the validator's key, in the app's words.
    if (result.message)
      return this.localise(result.message, this.resolvePathContext(path).repeatContext)
    return this._translate(result.key || INVALID_KEY, result.params)
  }

  // Every error getError would show, in the order the fields appear on
  // screen, rows in row order; paths no field renders come last. For an error
  // summary at the top of the form.
  getErrors(): FormError[] {
    const errors: FormError[] = []
    for (const path of Object.keys(this._validationResults)) {
      const message = this.getError(path)
      if (message === undefined) continue
      const target = this.getFieldId(path)
      errors.push({ path, message, label: this.getLabel(path), ...(target && { target }) })
    }
    return errors.sort((a, b) => this.compareScreenOrder(a.path, b.path))
  }

  // A mounted control for `path` gets an id; useField registers it here so
  // an error summary can link to it. Returns the function that unregisters
  // it. Ids belong to this engine only: two forms can capture the same path.
  registerField(path: string, id: string): () => void {
    this._fieldIds.set(path, [...(this._fieldIds.get(path) ?? []), id])
    return () => {
      const ids = [...(this._fieldIds.get(path) ?? [])]
      const index = ids.indexOf(id)
      if (index !== -1) ids.splice(index, 1)
      if (ids.length) this._fieldIds.set(path, ids)
      else this._fieldIds.delete(path)
    }
  }

  // The id of the control to jump to for `path`: the first one mounted for
  // it, or for a group (`address`, `items`) without a control of its own,
  // its first control on screen. Undefined when nothing for `path` is
  // mounted, like a hidden field.
  getFieldId(path: string): string | undefined {
    const own = this._fieldIds.get(path)?.[0]
    if (own) return own
    const inside = [...this._fieldIds.keys()]
      .filter((other) => other.startsWith(`${path}.`))
      .sort((a, b) => this.compareScreenOrder(a, b))[0]
    return inside === undefined ? undefined : this._fieldIds.get(inside)![0]
  }

  // The localised label of the field that renders `path`, or of the closest
  // field containing it; empty when no field does.
  getLabel(path: string): string {
    const { wildcardPath, repeatContext } = this.resolvePathContext(path)
    const field = findClosest(this._fieldsByPath, wildcardPath)
    return field?.label === undefined ? '' : this.localise(field.label, repeatContext)
  }

  // Whether the value at `path` (the whole form without one) differs from
  // the pristine values: what the form started with, or what markPristine()
  // saw last. Typing a value and changing it back is not a change.
  isDirty(path?: string): boolean {
    const now = path === undefined ? this._model : getProperty(this._model, path)
    const then = path === undefined ? this._pristine.value : getProperty(this._pristine.value, path)
    return contentOf(now) !== contentOf(then)
  }

  get dirty(): boolean {
    return this.isDirty()
  }

  // The current values become the pristine ones, e.g. after they were saved:
  // `dirty` is false again and reset() comes back here. Errors and touched
  // fields stay as they are.
  markPristine(): void {
    this._pristine.value = clonePlain(this._model)
  }

  // Back to the pristine values, as if nothing was done since: no field is
  // touched, the form isn't submitted, and errors are hidden until the next
  // blur or submit.
  reset(): void {
    const pristine = clonePlain(this._pristine.value)
    for (const key of Object.keys(this._model)) {
      if (!(key in pristine)) delete this._model[key]
    }
    Object.assign(this._model, pristine)
    this._touchedPaths.clear()
    this._submitted.value = false
    this.validateModel()
  }

  isConstant(path: string): boolean {
    return getProperty(this._constants, path) !== undefined
  }

  // Appends `item` (a plain object shape, `{}` by default) to the array at
  // `path` and re-validates the whole model — item indices shift on every
  // add/remove, so patching a single validation-result entry isn't enough.
  // `path` is already fully resolved (the caller — typically a `repeat`
  // field's own rendering — already knows its own base path).
  addRepeatItem(path: string, item: Record<string, unknown> = {}): void {
    const items = (this.getValue(path) as unknown[] | undefined) ?? []
    setProperty(this._model, path, [...items, item])
    this.validateModel()
  }

  removeRepeatItem(path: string, index: number): void {
    const items = (this.getValue(path) as unknown[] | undefined) ?? []
    setProperty(
      this._model,
      path,
      items.filter((_, i) => i !== index),
    )
    this.validateModel()
  }

  // For hide/disabled/readonly — defaults toward *not* hiding/disabling a
  // field if the expression throws, so a broken condition fails open
  // (visible/enabled) rather than silently locking a field away. Inside a
  // repeated row, a plain string/`{expression}` condition evaluates against
  // *that row* (unqualified `quantity` means this row's quantity) — the same
  // way the legacy _forms system worked — with `root: true` as the escape
  // hatch back to the whole model.
  resolveCondition(
    condition: ConditionValue | undefined,
    defaultResult = false,
    repeatContext?: RepeatContext,
  ): boolean {
    return this._validator.resolveCondition(
      this._model,
      condition,
      defaultResult,
      repeatContext,
      this.env,
    )
  }

  // Whether this one field is hidden by its own `hide`, in the row it is
  // rendered in. FormComponent uses it to leave the field out, and isHidden
  // evaluates every condition on the way to a path through it, so the two
  // can't disagree.
  isFieldHidden(field: Pick<FieldDefinition, 'hide'>, repeatContext?: RepeatContext): boolean {
    return this.resolveCondition(field.hide, false, repeatContext)
  }

  // `definition.validations` is the only source of rules — resolution is
  // driven entirely by that dictionary plus the live model's actual shape.
  // Validation is a model concern: a hidden field is validated like any
  // other, so a value can't slip through by hiding its field. A form that asks
  // for a value only while it is shown pairs `hide` with a rule `condition`.
  validatePath(path: string): ValidationResult {
    const result = this._validator.validatePath(this._model, path, this.env)
    this._validationResults[path] = result
    return result
  }

  validateModel(): boolean {
    const results = this._validator.validateAll(this._model, this.env)
    for (const [path, result] of results) this._validationResults[path] = result
    // Rows that were removed leave results behind; drop them.
    for (const path of Object.keys(this._validationResults)) {
      if (!results.has(path)) delete this._validationResults[path]
    }
    return [...results.values()].every((result) => result.valid)
  }

  getValidationResult(path: string): ValidationResult | undefined {
    return this._validationResults[path]
  }

  // Whether no field shows `path` right now: its own `hide`, a container's,
  // or a repeat row's is true. Hidden paths are still validated; this is for
  // whoever needs to tell, like an error summary that can't link to the field.
  // A path no field renders (a cross-field rule) is never hidden;
  // `address.street` follows the `address` field it belongs to.
  isHidden(path: string): boolean {
    const { wildcardPath, repeatContexts } = this.resolvePathContext(path)
    const fields = findClosest(this._hideConditions, wildcardPath)
    if (!fields) return false
    return fields.every((conditions) =>
      conditions.some(({ condition, depth }) =>
        this.isFieldHidden(
          { hide: condition },
          depth === 0 ? undefined : repeatContexts[depth - 1],
        ),
      ),
    )
  }

  // Whether the person can't change the value at `path`: it is a constant, or
  // every field that shows it is disabled or read-only, by its own condition
  // or a container's. Its rules still run (here and on the server); only
  // their errors aren't shown, since the person couldn't act on them.
  isLocked(path: string): boolean {
    if (this.isConstant(path)) return true
    const { wildcardPath, repeatContexts } = this.resolvePathContext(path)
    const fields = findClosest(this._lockConditions, wildcardPath)
    if (!fields) return false
    return fields.every((conditions) =>
      conditions.some(({ condition, depth }) =>
        this.resolveCondition(
          condition,
          false,
          depth === 0 ? undefined : repeatContexts[depth - 1],
        ),
      ),
    )
  }

  // Whether validation will demand a value at `path` right now: it has a
  // `required` rule whose `condition` (if any) holds, evaluated the way
  // validation evaluates it. Fields use this for their required marker, so
  // the marker never promises more, or less, than validation checks.
  isRequired(path: string): boolean {
    return this._validator.isRequired(this._model, path, this.env)
  }

  localise(key: LocalisableString | undefined, repeatContext?: RepeatContext): string {
    const resolvedKey = typeof key === 'object' ? this.resolveLabelBranch(key, repeatContext) : key
    // Read the locale here so a label is redrawn when it changes.
    void this._locale.value
    return this._localisationService.resolve(resolvedKey ?? '')
  }

  // Resolves a switch/case-shaped LocalisableString: each key is a candidate
  // localisation key, each value a condition gating it, first truthy wins in
  // object-key order (matches the legacy _forms system's label mechanism).
  private resolveLabelBranch(
    branches: Record<string, ConditionValue>,
    repeatContext?: RepeatContext,
  ): string | undefined {
    for (const [candidateKey, condition] of Object.entries(branches)) {
      if (this.resolveCondition(condition, false, repeatContext)) return candidateKey
    }
    console.warn('[form-engine] No branch matched in a localisable object', branches)
    return undefined
  }

  // Wraps a validator so an async answer is kept for the value it was given
  // and, once in, shown: the form is validated again. An answer for a value
  // that has changed since is dropped.
  private rememberAnswers(type: string, validator: Validator): Validator {
    return (context: ValidatorContext) => {
      const slot = `${type}|${context.path}`
      const key = JSON.stringify([context.value ?? null, context.rule])
      const known = this._asyncAnswers.get(slot)
      if (known?.key === key) return known.result ?? known.promise

      const outcome = validator(context)
      if (!isPromise(outcome)) return outcome

      const answer: AsyncAnswer = {
        key,
        failed: false,
        promise: outcome.then(
          (result) => {
            answer.result = result
            return result
          },
          (error: unknown) => {
            answer.failed = true
            answer.result = { valid: false, key: UNAVAILABLE_KEY }
            throw error
          },
        ),
      }
      this._asyncAnswers.set(slot, answer)
      const current = () => this._asyncAnswers.get(slot) === answer
      void answer.promise.then(
        () => current() && this.validateModel(),
        () => current() && this.validateModel(),
      )
      return answer.promise
    }
  }

  // The field type that renders `type`, if the form has one.
  getFieldType(type: string): FieldType | undefined {
    return this._fieldTypes[type]
  }

  getList(name: string): Promise<unknown[]> {
    return this._listService.getList(name)
  }

  // What expressions see as `env`: facts about where the form runs.
  private get env(): Record<string, unknown> {
    return { language: this._locale.value }
  }

  // Validates `path` and every group containing it that has rules of its
  // own, so an error on `address` follows a change to `address.street`.
  private revalidate(path: string): void {
    this.validatePath(path)
    const segments = path.split('.')
    for (let length = segments.length - 1; length > 0; length--) {
      const group = segments.slice(0, length).join('.')
      if (this._validator.hasRules(this._model, group)) {
        this.validatePath(group)
      }
    }
  }

  // Compares paths by where their fields appear on screen, rows in row
  // order; paths no field renders come last.
  private compareScreenOrder(a: string, b: string): number {
    const order = [...this._hideConditions.keys()]
    const position = (path: string) => {
      const segments = this.resolvePathContext(path).wildcardPath.split('.')
      for (let length = segments.length; length > 0; length--) {
        const index = order.indexOf(segments.slice(0, length).join('.'))
        if (index !== -1) return index
      }
      return order.length
    }
    return position(a) - position(b) || a.localeCompare(b, undefined, { numeric: true })
  }

  private resolvePathContext(path: string): PathContext {
    return resolvePathContext(this._model, path)
  }
}
