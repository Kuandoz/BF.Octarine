import type { ListProvider } from '@octarine/form-abstractions'

// The key of a failed rule whose validator named none.
export const INVALID_KEY = 'validation.invalid'

// The key of a rule whose check failed to run (a validator that threw, or a
// server that didn't answer). The value counts as invalid: better to ask
// again than to let it through unchecked.
export const UNAVAILABLE_KEY = 'validation.unavailable'

// No-op default: form-local `lists` still work with no provider at all;
// only *named, provider-backed* lists need a host app to supply one.
export const defaultListProvider: ListProvider = {
  getList: () => [],
}
