import { reactive } from 'vue'

import { describe, expect, it } from 'vitest'

import { FormEngine } from '../FormEngine'
import type { FormDefinition, LocalisableString } from '../types'
import { withFormEngine } from './testHelpers'
import { useLocalizedString } from './useLocalizedString'

const definition: FormDefinition = {
  components: [],
  localisations: {
    default: 'nl',
    nl: { Button: { Label: 'Bewaar' } },
  },
}

describe('useLocalizedString', () => {
  it('resolves a key through the form engine', () => {
    const engine = new FormEngine(definition)
    const label = withFormEngine(engine, () => useLocalizedString(() => 'Button.Label'))
    expect(label.value).toBe('Bewaar')
  })

  it('returns an empty string when no key is given', () => {
    const engine = new FormEngine(definition)
    const label = withFormEngine(engine, () => useLocalizedString(() => undefined))
    expect(label.value).toBe('')
  })

  it("shows the raw string when it doesn't match any localisation key", () => {
    const engine = new FormEngine(definition)
    const label = withFormEngine(engine, () => useLocalizedString(() => 'Just a plain label'))
    expect(label.value).toBe('Just a plain label')
  })

  it('resolves a switch/case label object reactively as the model changes', () => {
    const engine = new FormEngine(definition, { isSaving: false })
    const label = withFormEngine(engine, () =>
      useLocalizedString(() => ({ 'Button.Saving': 'isSaving', 'Button.Label': 'true' })),
    )
    expect(label.value).toBe('Bewaar')

    engine.setValue('isSaving', true)
    expect(label.value).toBe('Button.Saving')
  })

  it('re-reads the key on every access, so mutating its source is reflected live', () => {
    const engine = new FormEngine(definition)
    // A reactive object standing in for a FieldDefinition whose `.label` a
    // properties panel edits after the component already mounted (e.g. a
    // WYSIWYG builder) — reactive because that's what a real FieldDefinition
    // is once it's part of a form's reactive model.
    const source = reactive<{ label: LocalisableString | undefined }>({
      label: 'Just a plain label',
    })
    const label = withFormEngine(engine, () => useLocalizedString(() => source.label))
    expect(label.value).toBe('Just a plain label')

    source.label = 'Button.Label'
    expect(label.value).toBe('Bewaar')
  })
})
