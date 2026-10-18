# @octarine/form-abstractions

The types and interfaces of Octarine's JSON forms, with no runtime code. Every other form package
builds on them, and a package that only plugs something in (an expression language, a set of
validators, a client for the form service) depends on this one alone.

```ts
import type { FormDefinition, Validator } from '@octarine/form-abstractions'
```

Apps usually import the same types from [`@octarine/form-engine`](../form-engine), which repeats
them.

## What it holds

**The form definition**: `FormDefinition`, `FieldDefinition`, `ValidationRule`, `ConditionValue`,
`LocalisableString`, `FormLocalisations`, `RepeatContext`.

**Results and errors**:

| Type                | What it is                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `ValidatorResult`   | What a validator returns: `{ valid, key?, params? }`, or a promise of it.                        |
| `ValidationResult`  | The outcome of a path's rules: `{ valid: true }` or a `ValidationFailure`.                       |
| `ValidationFailure` | `{ valid: false, rule, key, params?, message? }`: the first rule that failed, as a message key.  |
| `ValidationPending` | `{ valid: false, pending: true, rule, settled }`: an async rule is still being checked.          |
| `SubmissionResult`  | `{ valid, errors }` for a whole submission; each `SubmissionError` is a failure with its `path`. |

Errors are message keys with parameters, never text, so the server can translate them or hand them
back to the client.

**Interfaces other packages implement**:

| Interface                                  | Implemented by                                                   |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `ExpressionLanguage`, `CompiledExpression` | form-core's `jsLanguage`; FEEL later, as its own package.        |
| `Validator`, `ValidatorContext`            | the built-in validators, and your own.                           |
| `SubmissionValidator`                      | form-core's local one; a remote one that calls the form service. |
| `TranslationProvider`                      | your app's i18n (e.g. a bridge to vue-i18n).                     |
| `ListProvider`                             | your app's source of named lists.                                |

## Rules for this package

Types only. `src/abstractions.spec.ts` compiles every source file and fails if anything is left
after the types are erased, or if the package gets a runtime dependency. The JSON schema for form
definitions will live here as data (step 5 in `HANDOFF.md`).

```sh
pnpm --filter @octarine/form-abstractions build   # dist/*.d.ts
pnpm --filter @octarine/form-abstractions test
```
