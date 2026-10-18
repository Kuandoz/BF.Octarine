import { reactive, ref } from 'vue'

import mitt from 'mitt'

import { ExpressionService } from './ExpressionService'
import { type ExpressionLanguage, findExpressionLanguage } from './expressions'
import { ListService } from './ListService'
import { LocalisationService } from './LocalisationService'
import { mergeDeep } from './mergeDeep'
import { declareFieldKeys, getProperty, removeProperty, setProperty } from './pathAccessors'
import {
  defaultExpressionLanguages,
  defaultListProvider,
  defaultTranslationProvider,
  type ListProvider,
  type TranslationProvider,
} from './services'
import type {
  ConditionValue,
  FieldDefinition,
  FormDefinition,
  FormError,
  LocalisableString,
  RepeatContext,
  ValidationResult,
} from './types'
import { ValidationService } from './ValidationService'
import type { ValidatorRegistry } from './validators'
import { collectFields, collectHideConditions, findClosest, type HideCondition } from './visibility'

type FormEngineEvents = {
  modelChanged: { path: string }
}

interface PathContext {
  // `path` with every array-index segment (one that sits under an actual
  // array in the live model) replaced by `*` — the key validations are
  // declared under, e.g. "items.2.quantity" -> "items.*.quantity".
  wildcardPath: string
  // The innermost repeat row `path` sits in, if any.
  repeatContext?: RepeatContext
  // Every repeat row `path` sits in, outermost first.
  repeatContexts: RepeatContext[]
}

export class FormEngine {
  readonly definition: FormDefinition

  private _model: Record<string, unknown>
  private _validationResults: Record<string, ValidationResult> = reactive({})
  private _dirtyPaths = reactive(new Set<string>())
  private _touchedPaths = reactive(new Set<string>())
  private _submitted = ref(false)
  private _translate: TranslationProvider['t']
  private _emitter = mitt<FormEngineEvents>()
  private _expressionService: ExpressionService
  private _validationService: ValidationService
  private _localisationService: LocalisationService
  private _listService: ListService
  private _defaults: Record<string, unknown>
  private _constants: Record<string, unknown>
  private _hideConditions: Map<string, HideCondition[][]>
  private _fields: Map<string, FieldDefinition>
  // The ids of the mounted controls for each path, in the order they were
  // mounted. Filled by useField.
  private _fieldIds = reactive(new Map<string, string[]>())
  private _locale = ref('')

  constructor(
    definition: FormDefinition,
    initialModel: Record<string, unknown> = {},
    validators?: ValidatorRegistry,
    translationProvider: TranslationProvider = defaultTranslationProvider,
    locale?: string,
    listProvider: ListProvider = defaultListProvider,
    expressionLanguages: readonly ExpressionLanguage[] = defaultExpressionLanguages,
  ) {
    this.definition = definition
    this._defaults = definition.defaults ?? {}
    this._translate = translationProvider.t
    this._constants = definition.constants ?? {}

    const isEmptyModel = Object.keys(initialModel).length === 0
    const seeded: Record<string, unknown> = {}
    mergeDeep(seeded, this._constants)
    if (isEmptyModel) mergeDeep(seeded, this._defaults)
    mergeDeep(seeded, initialModel)
    declareFieldKeys(definition.components, seeded)
    this._model = reactive(seeded)

    this._expressionService = new ExpressionService(
      findExpressionLanguage(expressionLanguages, definition.expressions),
    )
    this._validationService = new ValidationService(
      validators,
      translationProvider,
      this._expressionService,
    )
    this._localisationService = new LocalisationService(
      definition.localisations,
      locale,
      translationProvider,
    )
    this._listService = new ListService(definition.lists, listProvider)
    this._hideConditions = collectHideConditions(definition.components)
    this._fields = collectFields(definition.components)
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
    this._dirtyPaths.add(path)
    this.revalidate(path)
    this._emitter.emit('modelChanged', { path })
  }

  removeValue(path: string): void {
    removeProperty(this._model, path)

    const defaultValue = getProperty(this._defaults, path)
    if (defaultValue !== undefined) setProperty(this._model, path, defaultValue)

    this._dirtyPaths.add(path)
    this._emitter.emit('modelChanged', { path })
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

  // Validates every visible field and shows all their errors. Returns whether
  // the form can be sent.
  submit(): boolean {
    this._submitted.value = true
    return this.validateModel()
  }

  get submitted(): boolean {
    return this._submitted.value
  }

  // The error to show for `path`, if any. A value is validated as it
  // changes, but its error only appears once the field was left or a submit
  // was attempted, so nobody is told "invalid email" after typing one letter.
  // Once shown, it follows the value and disappears as soon as it is fixed.
  getError(path: string): string | undefined {
    if (!this._submitted.value && !this._touchedPaths.has(path)) return undefined
    const result = this.getValidationResult(path)
    if (!result || result.valid) return undefined
    return result.message || this._translate('formRenderer.validation.invalid')
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
    const field = findClosest(this._fields, wildcardPath)
    return field?.label === undefined ? '' : this.localise(field.label, repeatContext)
  }

  isDirty(path: string): boolean {
    return this._dirtyPaths.has(path)
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
    this._dirtyPaths.add(path)
    this.validateModel()
    this._emitter.emit('modelChanged', { path })
  }

  removeRepeatItem(path: string, index: number): void {
    const items = (this.getValue(path) as unknown[] | undefined) ?? []
    setProperty(
      this._model,
      path,
      items.filter((_, i) => i !== index),
    )
    this._dirtyPaths.add(path)
    this.validateModel()
    this._emitter.emit('modelChanged', { path })
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
    const scope = repeatContext ? this.getRowScope(repeatContext) : this._model
    return this._expressionService.resolve(
      condition,
      { scope, rootScope: this._model, env: this.env },
      defaultResult,
    )
  }

  on<K extends keyof FormEngineEvents>(
    type: K,
    handler: (event: FormEngineEvents[K]) => void,
  ): () => void {
    this._emitter.on(type, handler)
    return () => this._emitter.off(type, handler)
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
    const { wildcardPath, repeatContext } = this.resolvePathContext(path)
    const rules = this.definition.validations?.[wildcardPath]
    const scope = repeatContext ? this.getRowScope(repeatContext) : this._model
    const result = this._validationService.validate(
      rules,
      this.getValue(path),
      path,
      scope,
      this._model,
      this.env,
    )
    this._validationResults[path] = result
    return result
  }

  validateModel(): boolean {
    let valid = true
    const validated = new Set<string>()
    for (const [wildcardKey, rules] of Object.entries(this.definition.validations ?? {})) {
      for (const { path, repeatContext } of this.expandWildcardPaths(wildcardKey)) {
        const scope = repeatContext ? this.getRowScope(repeatContext) : this._model
        const result = this._validationService.validate(
          rules,
          this.getValue(path),
          path,
          scope,
          this._model,
          this.env,
        )
        this._validationResults[path] = result
        validated.add(path)
        if (!result.valid) valid = false
      }
    }
    // Rows that were removed leave results behind; drop them.
    for (const path of Object.keys(this._validationResults)) {
      if (!validated.has(path)) delete this._validationResults[path]
    }
    return valid
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

  // Whether validation will demand a value at `path` right now: it has a
  // `required` rule whose `condition` (if any) holds, evaluated the way
  // validation evaluates it. Fields use this for their required marker, so
  // the marker never promises more, or less, than validation checks.
  isRequired(path: string): boolean {
    const { wildcardPath, repeatContext } = this.resolvePathContext(path)
    const scope = repeatContext ? this.getRowScope(repeatContext) : this._model
    return (this.definition.validations?.[wildcardPath] ?? []).some(
      (rule) =>
        rule.type === 'required' &&
        this._validationService.isActive(rule, scope, this._model, this.env),
    )
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
      if (this.definition.validations?.[this.resolvePathContext(group).wildcardPath]) {
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

  private getRowScope(repeatContext: RepeatContext): Record<string, unknown> {
    const row = this.getValue(`${repeatContext.arrayPath}.${repeatContext.arrayIndex}`)
    return row !== null && typeof row === 'object' ? (row as Record<string, unknown>) : {}
  }

  // Given a fully-resolved path (e.g. "items.2.quantity"), walks its segments
  // against the live model to figure out which numeric segments are actually
  // array indices (as opposed to, say, a literal object key that happens to
  // be a digit string) — a segment counts only if the model value at its
  // prefix is a real array. Building this from the model rather than from
  // `definition.components` is what lets validation stay fully independent
  // of the rendering schema.
  private resolvePathContext(path: string): PathContext {
    const segments = path.split('.')
    const repeatContexts: RepeatContext[] = []
    let prefix = ''
    const wildcardSegments = segments.map((segment) => {
      const isArrayIndex = /^\d+$/.test(segment) && Array.isArray(this.getValue(prefix))
      if (isArrayIndex) repeatContexts.push({ arrayPath: prefix, arrayIndex: Number(segment) })
      prefix = prefix ? `${prefix}.${segment}` : segment
      return isArrayIndex ? '*' : segment
    })
    return {
      wildcardPath: wildcardSegments.join('.'),
      repeatContext: repeatContexts.at(-1),
      repeatContexts,
    }
  }

  // The inverse of resolvePathContext: given a validations-dictionary key
  // (with `*` for repeated segments), enumerates every concrete path it
  // currently applies to by walking the live model — a `*` with no array at
  // that position simply expands to nothing (that row/branch doesn't exist
  // yet).
  private expandWildcardPaths(
    wildcardKey: string,
  ): Array<{ path: string; repeatContext?: RepeatContext }> {
    const segments = wildcardKey.split('.')
    const results: Array<{ path: string; repeatContext?: RepeatContext }> = []

    const walk = (index: number, currentPath: string, repeatContext: RepeatContext | undefined) => {
      if (index === segments.length) {
        results.push({ path: currentPath, repeatContext })
        return
      }
      const segment = segments[index]!
      if (segment === '*') {
        const items = this.getValue(currentPath)
        if (!Array.isArray(items)) return
        items.forEach((_, arrayIndex) => {
          walk(index + 1, `${currentPath}.${arrayIndex}`, { arrayPath: currentPath, arrayIndex })
        })
      } else {
        walk(index + 1, currentPath ? `${currentPath}.${segment}` : segment, repeatContext)
      }
    }
    walk(0, '', undefined)

    return results
  }
}
