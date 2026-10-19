// @vitest-environment jsdom
import { computed, nextTick } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import FormRenderer from './components/FormRenderer.vue'
import { FormEngine } from './FormEngine'
import { createForms } from './forms'
import type { FormDefinition, ValidatorResult } from './types'

// A server check whose answers the test hands out by hand.
function serverCheck() {
  const calls: Array<{
    value: unknown
    answer: (result: ValidatorResult) => void
    fail: () => void
  }> = []
  const validator = vi.fn(
    ({ value }: { value: unknown }) =>
      new Promise<ValidatorResult>((resolve, reject) => {
        calls.push({ value, answer: resolve, fail: () => reject(new Error('offline')) })
      }),
  )
  return { validator, calls }
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

const definition: FormDefinition = {
  components: [
    { type: 'text', path: 'email' },
    { type: 'text', path: 'name' },
  ],
  validations: {
    email: [{ type: 'required' }, { type: 'uniqueEmail' }],
    name: [{ type: 'required' }],
  },
}

function engineWith(check: ReturnType<typeof serverCheck>, model = {}) {
  return new FormEngine(definition, { model, validators: { uniqueEmail: check.validator } })
}

describe('async rules', () => {
  it('make a path pending and show nothing until the answer is in', async () => {
    const check = serverCheck()
    const engine = engineWith(check)
    engine.touch('email')
    engine.setValue('email', 'ada@example.com')

    expect(engine.isPending('email')).toBe(true)
    expect(engine.pending).toBe(true)
    expect(engine.getError('email')).toBeUndefined()

    check.calls.at(-1)!.answer({ valid: false, key: 'emailTaken' })
    await flush()
    expect(engine.isPending('email')).toBe(false)
    expect(engine.getValidationResult('email')).toMatchObject({ key: 'emailTaken' })
    expect(engine.getError('email')).toBe('emailTaken')
  })

  it('run only after the sync rules before them pass', () => {
    const check = serverCheck()
    const engine = engineWith(check)
    engine.validateModel()
    expect(check.validator).not.toHaveBeenCalled()
    expect(engine.getValidationResult('email')).toMatchObject({ rule: 'required' })
  })

  it('ask again only when their own value changes', async () => {
    const check = serverCheck()
    const engine = engineWith(check, { email: 'ada@example.com' })
    engine.validateModel()
    check.calls[0]!.answer({ valid: true })
    await flush()

    engine.setValue('name', 'Ada')
    engine.setValue('name', 'Ada L')
    expect(check.validator).toHaveBeenCalledTimes(1)

    engine.setValue('email', 'grace@example.com')
    expect(check.validator).toHaveBeenCalledTimes(2)
  })

  it('drop an answer for a value that has changed since', async () => {
    const check = serverCheck()
    const engine = engineWith(check)
    engine.setValue('email', 'old@example.com')
    engine.setValue('email', 'new@example.com')
    check.calls[0]!.answer({ valid: false, key: 'emailTaken' })
    await flush()
    expect(engine.isPending('email')).toBe(true)

    check.calls[1]!.answer({ valid: true })
    await flush()
    expect(engine.getValidationResult('email')).toEqual({ valid: true })
  })

  it('are waited for by submit', async () => {
    const check = serverCheck()
    const engine = engineWith(check, { email: 'ada@example.com', name: 'Ada' })
    const sent = engine.submit()
    expect(engine.submitting).toBe(true)

    await flush()
    check.calls.at(-1)!.answer({ valid: true })
    await expect(sent).resolves.toBe(true)
    expect(engine.submitting).toBe(false)
  })

  it("fail closed when the check can't run, and are tried again on the next submit", async () => {
    const check = serverCheck()
    const engine = engineWith(check, { email: 'ada@example.com', name: 'Ada' })
    const first = engine.submit()
    await flush()
    check.calls.at(-1)!.fail()
    await expect(first).resolves.toBe(false)
    expect(engine.getError('email')).toBe(
      "This couldn't be checked right now. Please try again later.",
    )

    const second = engine.submit()
    await flush()
    expect(check.validator).toHaveBeenCalledTimes(2)
    check.calls.at(-1)!.answer({ valid: true })
    await expect(second).resolves.toBe(true)
  })

  it('are reactive through isPending', async () => {
    const check = serverCheck()
    const engine = engineWith(check)
    const pending = computed(() => engine.isPending('email'))
    engine.setValue('email', 'ada@example.com')
    expect(pending.value).toBe(true)
    check.calls.at(-1)!.answer({ valid: true })
    await flush()
    expect(pending.value).toBe(false)
  })
})

describe('FormRenderer with async rules', () => {
  it('marks the form busy while it waits, and sends once on a double submit', async () => {
    const check = serverCheck()
    const forms = createForms({ validators: { uniqueEmail: check.validator } })
    const wrapper = mount(FormRenderer, {
      props: { definition, model: { email: 'ada@example.com', name: 'Ada' } },
      global: { plugins: [forms] },
    })
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    await nextTick()
    expect(wrapper.get('form').attributes('aria-busy')).toBe('true')

    check.calls.at(-1)!.answer({ valid: true })
    await flush()
    await nextTick()
    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(wrapper.get('form').attributes('aria-busy')).toBeUndefined()
  })
})
