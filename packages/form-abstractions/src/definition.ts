// A boolean literal, an expression string evaluated against the
// current scope (e.g. "age(birthDate) > 18"), or an object form that can
// force root-scope evaluation (`root: true` — ignores whatever repeated-item
// scope would otherwise apply) and/or override the fallback used if the
// expression throws.
export type ConditionValue =
  boolean | string | { expression: string; root?: boolean; defaultValue?: boolean }

// A plain string is a localisation key/literal text. An object is a
// switch/case over localisation keys: each key is a candidate localisation
// key, each value a ConditionValue gating it, evaluated in object-key order —
// the first truthy condition wins. There's no dedicated "default" key; add a
// trailing entry whose condition is the literal `true` for an else-branch
// (see FormEngine.localise).
export type LocalisableString = string | Record<string, ConditionValue>

export interface ValidationRule {
  type: string
  message?: string
  // Gates whether this rule runs at all. Unlike hide/disabled/readonly,
  // defaults toward the rule staying *active* if the expression throws —
  // see ExpressionService/ValidationService for why.
  condition?: ConditionValue
  [param: string]: unknown
}

export interface FieldDefinition {
  type: string
  path?: string
  label?: LocalisableString
  hint?: LocalisableString
  // `{ width: 'half' | 'third' }`; see layout.ts.
  layout?: { width?: string }
  hide?: ConditionValue
  disabled?: ConditionValue
  readonly?: ConditionValue
  components?: FieldDefinition[]
  [key: string]: unknown
}

export interface LocalisationTable {
  [key: string]: string | LocalisationTable
}

export interface FormLocalisations {
  default?: string
  [locale: string]: LocalisationTable | string | undefined
}

export interface FormDefinition {
  components: FieldDefinition[]
  // The language the form's expressions are written in, by name: 'js' (the
  // default) or any other ExpressionLanguage the app registered.
  expressions?: string
  // Keyed by a field's resolved dot-path (e.g. "address.street"). A path
  // segment inside a `repeat` field is a wildcard `*` instead of a concrete
  // index (e.g. "items.*.quantity") — one entry covers every row; expanded
  // against the live model, not the schema (see FormEngine.validateModel).
  // Validation is a model concern, not a component one: nothing here needs a
  // rendered field behind it — a path with no corresponding UI field works
  // too (e.g. a cross-field rule like "endDate").
  validations?: Record<string, ValidationRule[]>
  localisations?: FormLocalisations
  // Form-local named lists. Items are arbitrary objects — mapping them to
  // whatever shape a control needs is the field component's job.
  lists?: Record<string, unknown[]>
  // Seeds the model only when it's constructed empty (e.g. a fresh form) —
  // an existing model being re-opened is left alone.
  defaults?: Record<string, unknown>
  // Seeds the model unconditionally, whether the model is fresh or being
  // re-opened. The server is the actual authority that these don't change;
  // client-side they're just an initial value plus a signal to keep the
  // corresponding field non-editable (see FormEngine.isConstant).
  constants?: Record<string, unknown>
}

// The ambient "which row am I in" state for a field nested inside a `repeat`
// field's `components`. `arrayPath` is already fully resolved (folds in any
// outer repeat this one is nested inside), so a field's own path is just
// `${arrayPath}.${arrayIndex}.${field.path}` — see resolveFieldPath.
export interface RepeatContext {
  arrayPath: string
  arrayIndex: number
}
