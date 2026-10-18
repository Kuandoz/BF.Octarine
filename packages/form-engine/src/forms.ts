import {
  type App,
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from 'vue'

import type { FieldType } from './fields'
import { FormEngine, type FormEngineOptions } from './FormEngine'
import { clonePlain } from './mergeDeep'
import type { FormDefinition } from './types'

// What every form of an app shares. `validators`, `functions`,
// `expressionLanguages` and `repeatTypes` have the same shape as the options
// of form-core's validateSubmission, so one module can feed both the app and
// the server:
//
//   // rules.ts, imported by the app and by the form service
//   export const rules = { validators: { iban }, functions: { workingDays } }
//
//   createForms({ ...rules, fields: [textField, repeatField] })
//   validateSubmission(definition, model, rules)
export interface FormsOptions extends Omit<FormEngineOptions, 'model' | 'locale' | 'fields'> {
  fields?: readonly FieldType[]
}

export interface Forms {
  // For `app.use(forms)`: makes these the forms of every component below.
  install(app: App): void
  /** A form with this setup. `options` add to it (validators) or set what is per form. */
  createEngine(definition: FormDefinition, options?: FormEngineOptions): FormEngine
}

export const FORMS_KEY: InjectionKey<Forms> = Symbol('octarine-form:forms')

/**
 * Sets up the forms of an app: the field types they render, and the
 * validators, functions, lists and translations they use. Replaces the
 * global registries; two apps (or two Forms in one app) don't share any.
 *
 * ```ts
 * const forms = createForms({ fields: [textField], validators, translate: i18n.global.t })
 * app.use(forms)
 * ```
 */
export function createForms(options: FormsOptions = {}): Forms {
  const { fields = [], ...shared } = options
  const fieldTypes: Record<string, FieldType> = {}
  for (const field of fields) fieldTypes[field.type] = field

  const forms: Forms = {
    install(app) {
      app.provide(FORMS_KEY, forms)
    },
    createEngine(definition, own = {}) {
      return new FormEngine(definition, {
        ...shared,
        ...own,
        validators: { ...shared.validators, ...own.validators },
        functions: { ...shared.functions, ...own.functions },
        expressionLanguages: [
          ...(own.expressionLanguages ?? []),
          ...(shared.expressionLanguages ?? []),
        ],
        repeatTypes: [...(shared.repeatTypes ?? []), ...(own.repeatTypes ?? [])],
        fields: { ...fieldTypes, ...own.fields },
      })
    },
  }
  return forms
}

const noForms = createForms()

// The Forms an app installed; without one, forms have no field types and only
// the built-in rules.
export function useForms(): Forms {
  return inject(FORMS_KEY, noForms)
}

export interface UseFormOptions extends Omit<FormEngineOptions, 'model' | 'locale'> {
  model?: MaybeRefOrGetter<Record<string, unknown> | undefined>
  locale?: MaybeRefOrGetter<string | undefined>
  // A setup to use instead of the installed one (useForms()), e.g. for a
  // component that brings its own field types.
  forms?: Forms
}

// Compared by content: a template that builds a model inline (`:model="{}"`)
// passes a new object on every render, and that must not throw away what was
// filled in.
const contentOf = (value: unknown) => JSON.stringify(value ?? null)

/**
 * A form for `<FormRenderer :form>`, with the app's Forms setup. Pass refs or
 * getters to follow changes:
 *
 * - a changed **definition** (a builder's preview) makes a new engine that
 *   keeps the values filled in;
 * - a changed **model** starts over with those values;
 * - a changed **locale** switches the language in place.
 *
 * The result is a ref because a change can replace the engine.
 */
export function useForm(
  definition: MaybeRefOrGetter<FormDefinition>,
  options: UseFormOptions = {},
): Readonly<ShallowRef<FormEngine>> {
  const { model, locale, forms = useForms(), ...rest } = options
  const create = (values: Record<string, unknown> | undefined) =>
    forms.createEngine(toValue(definition), { ...rest, model: values, locale: toValue(locale) })

  const engine = shallowRef(create(toValue(model)))

  let lastDefinition = contentOf(toValue(definition))
  let lastModel = contentOf(toValue(model))
  watch(
    () => toValue(definition),
    (next) => {
      const content = contentOf(next)
      if (content === lastDefinition) return
      lastDefinition = content
      engine.value = create(clonePlain(engine.value.model))
    },
    { deep: true },
  )
  watch(
    () => toValue(model),
    (next) => {
      const content = contentOf(next)
      if (content === lastModel) return
      lastModel = content
      engine.value = create(next)
    },
    { deep: true },
  )
  watch(
    () => toValue(locale),
    (next) => engine.value.setLocale(next),
  )

  return engine
}
