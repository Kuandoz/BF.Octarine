// subscript ships types for its main entry only; this is the parse-only one.
declare module 'subscript/feature/justin.js' {
  // An identifier, a literal `[undefined, value]`, or an operation
  // `[operator, ...operands]`.
  export type AST = string | [undefined, unknown] | [string, ...AST[]] | []
  export function parse(source: string): AST
}
