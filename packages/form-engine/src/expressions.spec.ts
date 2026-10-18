// @vitest-environment jsdom
import { defineComponent, h } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FormRenderer from './components/FormRenderer.vue'
import { ExpressionService } from './ExpressionService'
import { type ExpressionLanguage, ExpressionError, findExpressionLanguage } from './expressions'
import { FormEngine } from './FormEngine'
import { provideFormRendererServices, withExpressionLanguages } from './services'
import type { FormDefinition } from './types'

// A toy language: "field is value", "not field", or "fn(field)".
const toy: ExpressionLanguage = {
  name: 'toy',
  compile(source) {
    const is = /^(\w+) is (\w+)$/.exec(source)
    if (is) return { evaluate: ({ scope }) => String(scope[is[1]!]) === is[2] }
    const not = /^not (\w+)$/.exec(source)
    if (not) return { evaluate: ({ scope }) => !scope[not[1]!] }
    const call = /^(\w+)\((\w+)\)$/.exec(source)
    if (call) return { evaluate: ({ scope, functions }) => functions[call[1]!]!(scope[call[2]!]) }
    const env = /^env (\w+) is (\w+)$/.exec(source)
    if (env) return { evaluate: ({ env: facts }) => facts[env[1]!] === env[2] }
    throw new ExpressionError(`toy can't read "${source}"`, 0)
  },
}

describe('findExpressionLanguage', () => {
  it('picks the language by name, js by default', () => {
    const js: ExpressionLanguage = { name: 'js', compile: toy.compile }
    expect(findExpressionLanguage([js, toy])).toBe(js)
    expect(findExpressionLanguage([js, toy], 'toy')).toBe(toy)
  })

  it('fails for a language nobody registered', () => {
    expect(() => findExpressionLanguage([toy], 'feel')).toThrow(
      'The form uses expression language "feel", but only "toy" is registered.',
    )
  })
})

describe('withExpressionLanguages', () => {
  it('adds languages to the built-in js, and replaces js when given one', () => {
    expect(withExpressionLanguages([toy]).map((language) => language.name)).toEqual(['toy', 'js'])
    const myJs: ExpressionLanguage = { name: 'js', compile: toy.compile }
    expect(withExpressionLanguages([myJs])).toEqual([myJs])
  })
})

describe('ExpressionService with another language', () => {
  it('evaluates through the language, with the engine handling scope and root', () => {
    const service = new ExpressionService(toy)
    expect(service.resolve('mode is phone', { scope: { mode: 'phone' } })).toBe(true)
    expect(
      service.resolve(
        { expression: 'mode is phone', root: true },
        { scope: { mode: 'mail' }, rootScope: { mode: 'phone' } },
      ),
    ).toBe(true)
  })

  it('passes the functions and env to the language', () => {
    const service = new ExpressionService(toy, { adult: (age) => (age as number) >= 18 })
    expect(service.resolve('adult(age)', { scope: { age: 20 } })).toBe(true)
    expect(service.resolve('env language is nl', { scope: {}, env: { language: 'nl' } })).toBe(true)
  })

  it('falls back to the default when the language rejects an expression', () => {
    const service = new ExpressionService(toy)
    expect(service.resolve('???', { scope: {} }, true)).toBe(true)
    expect(service.resolve('???', { scope: {} }, false)).toBe(false)
    expect(() => service.compile('???')).toThrow(ExpressionError)
  })

  it('compiles each source once', () => {
    let compiles = 0
    const counting: ExpressionLanguage = {
      name: 'toy',
      compile: (source) => (compiles++, toy.compile(source)),
    }
    const service = new ExpressionService(counting)
    for (let i = 0; i < 3; i++) service.resolve('mode is phone', { scope: { mode: 'phone' } })
    expect(compiles).toBe(1)
  })
})

describe('a form written in another language', () => {
  const definition = (): FormDefinition => ({
    expressions: 'toy',
    components: [
      { type: 'text', path: 'mode' },
      { type: 'text', path: 'phone', hide: 'not wantsCall' },
    ],
    validations: { phone: [{ type: 'required', condition: 'mode is phone' }] },
  })

  it('uses it for hide, rule conditions and required markers', () => {
    const engine = new FormEngine(
      definition(),
      { mode: 'phone', wantsCall: true },
      undefined,
      undefined,
      undefined,
      undefined,
      withExpressionLanguages([toy]),
    )

    expect(engine.isHidden('phone')).toBe(false)
    expect(engine.isRequired('phone')).toBe(true)
    expect(engine.submit()).toBe(false)

    engine.setValue('wantsCall', false)
    expect(engine.isHidden('phone')).toBe(true)

    engine.setValue('mode', 'mail')
    expect(engine.isRequired('phone')).toBe(false)
    expect(engine.submit()).toBe(true)
  })

  it('fails to construct when the language is not registered', () => {
    expect(() => new FormEngine(definition())).toThrow('expression language "toy"')
  })

  it('gets the language from provideFormRendererServices', () => {
    const Field = defineComponent({
      props: ['field'],
      setup: (props) => () => h('div', { class: 'field' }, props.field.path),
    })
    const App = defineComponent({
      setup() {
        provideFormRendererServices({ expressionLanguages: [toy] })
        return () =>
          h(FormRenderer, {
            definition: definition(),
            model: { wantsCall: false },
            components: { text: Field },
          })
      },
    })

    const wrapper = mount(App)
    expect(wrapper.findAll('.field').map((field) => field.text())).toEqual(['mode'])
  })
})
