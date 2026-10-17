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
  FormDefinition,
  LocalisableString,
  RepeatContext,
  ValidationResult,
} from './types'
import { ValidationService } from './ValidationService'
import type { ValidatorRegistry } from './validators'
import { collectHideConditions, findHideConditions, type HideCondition } from './visibility'

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
    this.validatePath(path)
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
    this.validatePath(path)
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
  getErrors(): Array<{ path: string; message: string }> {
    const order = [...this._hideConditions.keys()]
    const position = (path: string) => {
      const segments = this.resolvePathContext(path).wildcardPath.split('.')
      for (let length = segments.length; length > 0; length--) {
        const index = order.indexOf(segments.slice(0, length).join('.'))
        if (index !== -1) return index
      }
      return order.length
    }

    const errors: Array<{ path: string; message: string }> = []
    for (const path of Object.keys(this._validationResults)) {
      const message = this.getError(path)
      if (message !== undefined) errors.push({ path, message })
    }
    return errors.sort(
      (a, b) =>
        position(a.path) - position(b.path) ||
        a.path.localeCompare(b.path, undefined, { numeric: true }),
    )
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
      { scope, rootScope: this._model, env: { language: this._localisationService.locale } },
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

  // `definition.validations` is the only source of rules — resolution is
  // driven entirely by that dictionary plus the live model's actual shape.
  // Validation is a model concern, except that a path whose fields are all
  // hidden is skipped (see isHidden).
  validatePath(path: string): ValidationResult {
    const { wildcardPath, repeatContext } = this.resolvePathContext(path)
    const rules = this.definition.validations?.[wildcardPath]
    const scope = repeatContext ? this.getRowScope(repeatContext) : this._model
    const result = this.isHidden(path)
      ? { valid: true }
      : this._validationService.validate(rules, this.getValue(path), path, scope, this._model)
    this._validationResults[path] = result
    return result
  }

  validateModel(): boolean {
    let valid = true
    const validated = new Set<string>()
    for (const [wildcardKey, rules] of Object.entries(this.definition.validations ?? {})) {
      for (const { path, repeatContext } of this.expandWildcardPaths(wildcardKey)) {
        const scope = repeatContext ? this.getRowScope(repeatContext) : this._model
        const result = this.isHidden(path)
          ? { valid: true }
          : this._validationService.validate(rules, this.getValue(path), path, scope, this._model)
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

  // A field that became hidden after it was validated no longer shows its
  // error: the user can't see or fix it.
  getValidationResult(path: string): ValidationResult | undefined {
    const result = this._validationResults[path]
    return result && !result.valid && this.isHidden(path) ? { valid: true } : result
  }

  // Whether no field shows `path` right now: its own `hide`, a container's,
  // or a repeat row's is true. A hidden path isn't validated, since the user
  // can't fix it. A path no field renders (a cross-field rule) is never
  // hidden; `address.street` follows the `address` field it belongs to.
  isHidden(path: string): boolean {
    const { wildcardPath, repeatContexts } = this.resolvePathContext(path)
    const fields = findHideConditions(this._hideConditions, wildcardPath)
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
    const { wildcardPath, repeatContext } = this.resolvePathContext(path)
    const scope = repeatContext ? this.getRowScope(repeatContext) : this._model
    return (this.definition.validations?.[wildcardPath] ?? []).some(
      (rule) =>
        rule.type === 'required' && this._validationService.isActive(rule, scope, this._model),
    )
  }

  localise(key: LocalisableString | undefined, repeatContext?: RepeatContext): string {
    const resolvedKey = typeof key === 'object' ? this.resolveLabelBranch(key, repeatContext) : key
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
