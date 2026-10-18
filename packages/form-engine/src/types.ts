// The form types live in @octarine/form-abstractions; they are repeated here
// so an app needs only this package.
export type * from '@octarine/form-abstractions'

// One error of FormEngine.getErrors, for an error summary: a rule that failed,
// put into words for the person filling in the form.
export interface FormError {
  path: string
  message: string
  // The label of the field that renders `path` (or contains it), localised;
  // empty when no field does. A summary entry without a target needs it to
  // say what the error is about.
  label: string
  // The id of the control to jump to: the field at `path`, or the first
  // control inside it for a group. Absent when nothing for `path` is on
  // screen, e.g. a hidden field.
  target?: string
}
