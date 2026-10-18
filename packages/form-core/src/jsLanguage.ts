import { type AST, parse } from 'subscript/feature/justin.js'

import type { EvaluationContext, ExpressionLanguage } from '@octarine/form-abstractions'

import { ExpressionError } from './expressions'

// The built-in "js" language: JS expression syntax, for conditions.
//
// subscript only parses; evaluating is done here, so what an expression can
// do is decided here too. It reads fields, compares and combines values, and
// calls the form's functions plus a few string and array methods. It can't
// assign, define functions, or reach anything outside the scope it is given:
// properties are read only from plain data (own properties of objects,
// indexes and `length` of arrays and strings), so `constructor`, `__proto__`
// and globals are out of reach.
//
// It differs from JS in one way: reading a property of a missing value gives
// `undefined` instead of throwing, so `contact.address.city` works before
// `address` was filled in. A name that is neither a field, `env` nor a
// function still fails, so a typo in a field name is reported instead of
// quietly being `undefined`.

type Node = AST
type Evaluate = (context: EvaluationContext) => unknown

const STRING_METHODS = new Set([
  'includes',
  'startsWith',
  'endsWith',
  'toLowerCase',
  'toUpperCase',
  'trim',
])
const ARRAY_METHODS = new Set(['includes', 'indexOf', 'join'])

const BINARY: Record<string, (a: unknown, b: unknown) => unknown> = {
  '===': (a, b) => a === b,
  '!==': (a, b) => a !== b,
  // Loose equality is allowed: an input's "18" and a number 18 compare equal.
  '==': (a, b) => a == b,
  '!=': (a, b) => a != b,
  '<': (a, b) => (a as number) < (b as number),
  '<=': (a, b) => (a as number) <= (b as number),
  '>': (a, b) => (a as number) > (b as number),
  '>=': (a, b) => (a as number) >= (b as number),
  '+': (a, b) => (a as number) + (b as number),
  '-': (a, b) => (a as number) - (b as number),
  '*': (a, b) => (a as number) * (b as number),
  '/': (a, b) => (a as number) / (b as number),
  '%': (a, b) => (a as number) % (b as number),
}

const UNARY: Record<string, (a: unknown) => unknown> = {
  '!': (a) => !a,
  '-': (a) => -(a as number),
  '+': (a) => +(a as number),
  typeof: (a) => typeof a,
}

function isLiteral(node: Node): node is [undefined, unknown] {
  return Array.isArray(node) && node[0] === undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

// Reads `key` from plain data only.
function readProperty(target: unknown, key: unknown): unknown {
  if (target === null || target === undefined) return undefined
  if (typeof target === 'string' || Array.isArray(target)) {
    if (key === 'length') return target.length
    if (typeof key === 'number' || (typeof key === 'string' && /^\d+$/.test(key))) {
      return target[Number(key)]
    }
    return undefined
  }
  if (isPlainObject(target) && typeof key === 'string' && Object.hasOwn(target, key)) {
    return target[key]
  }
  return undefined
}

// `a, b, c` parses to [',', a, b, c]; a single argument is just the node.
function listItems(node: Node | undefined): Node[] {
  if (node === undefined || node === null) return []
  return Array.isArray(node) && node[0] === ',' ? (node.slice(1) as Node[]) : [node]
}

function unsupported(what: string): never {
  throw new ExpressionError(`${what} isn't supported in form expressions`)
}

function compileNode(node: Node): Evaluate {
  // `undefined` parses to an empty node.
  if (Array.isArray(node) && node.length === 0) return () => undefined

  if (typeof node === 'string') return compileName(node)
  if (isLiteral(node)) {
    const value = node[1]
    return () => value
  }

  const [op, ...args] = node as [string, ...Node[]]
  const [a, b, c] = args

  if (op === '.' || op === '?.') {
    const target = compileNode(a!)
    const key = b as string
    return (context) => readProperty(target(context), key)
  }
  if ((op === '[]' || op === '?.[]') && args.length === 2) {
    const target = compileNode(a!)
    const key = compileNode(b!)
    return (context) => readProperty(target(context), key(context))
  }
  if (op === '[]') {
    const items = listItems(a).map(compileNode)
    return (context) => items.map((item) => item(context))
  }
  // `(a || b)` is a group with one operand; `f(x)` a call with two.
  if (op === '()' && args.length === 1) return compileNode(a!)
  if (op === '()') return compileCall(a!, listItems(b))

  if (op === '&&') {
    const left = compileNode(a!)
    const right = compileNode(b!)
    return (context) => left(context) && right(context)
  }
  if (op === '||') {
    const left = compileNode(a!)
    const right = compileNode(b!)
    return (context) => left(context) || right(context)
  }
  if (op === '??') {
    const left = compileNode(a!)
    const right = compileNode(b!)
    return (context) => left(context) ?? right(context)
  }
  if (op === '?') {
    const test = compileNode(a!)
    const then = compileNode(b!)
    const otherwise = compileNode(c!)
    return (context) => (test(context) ? then(context) : otherwise(context))
  }
  const binary = BINARY[op]
  if (binary && args.length === 2) {
    const left = compileNode(a!)
    const right = compileNode(b!)
    return (context) => binary(left(context), right(context))
  }
  const unary = UNARY[op]
  if (unary && args.length === 1) {
    const operand = compileNode(a!)
    return (context) => unary(operand(context))
  }

  return unsupported(`"${op}"`)
}

function compileName(name: string): Evaluate {
  return ({ scope, env, functions }) => {
    if (name === 'env') return env
    if (Object.hasOwn(functions, name)) return functions[name]
    if (Object.hasOwn(scope, name)) return scope[name]
    throw new ExpressionError(`"${name}" is not a field, env or a function`)
  }
}

function compileCall(callee: Node, argNodes: Node[]): Evaluate {
  const args = argNodes.map(compileNode)

  // A function of the form: `age(birthDate)`.
  if (typeof callee === 'string') {
    return (context) => {
      if (!Object.hasOwn(context.functions, callee)) {
        throw new ExpressionError(`"${callee}" is not a function`)
      }
      return context.functions[callee]!(...args.map((arg) => arg(context)))
    }
  }

  // A method of a value: `name.startsWith('A')`, `tags.includes('x')`.
  if (Array.isArray(callee) && (callee[0] === '.' || callee[0] === '?.')) {
    const target = compileNode(callee[1] as Node)
    const method = callee[2] as string
    const optional = callee[0] === '?.'
    return (context) => {
      const value = target(context)
      if (optional && (value === null || value === undefined)) return undefined
      const allowed =
        typeof value === 'string'
          ? STRING_METHODS.has(method)
          : Array.isArray(value) && ARRAY_METHODS.has(method)
      if (!allowed) throw new ExpressionError(`"${method}" can't be called here`)
      const fn = (value as unknown as Record<string, (...a: unknown[]) => unknown>)[method]!
      return fn.apply(
        value,
        args.map((arg) => arg(context)),
      )
    }
  }

  return unsupported('This kind of call')
}

// The model paths an expression reads: `contact.mode` from
// `contact.mode === 'phone'`, `birthDate` from `age(birthDate)`. A literal
// index stays in the path (`items[0].name` reads `items.0.name`); a computed
// one becomes `*`, as in validation keys (`items[i].name` reads
// `items.*.name`, and `i`). `length` and method names aren't part of it.
function collectDependencies(node: Node, into: Set<string>): void {
  const path = memberPath(node, into)
  if (path !== undefined) {
    if (path !== 'env' && !path.startsWith('env.')) into.add(path)
    return
  }
  if (!Array.isArray(node) || isLiteral(node)) return

  const [op, ...args] = node as [string, ...Node[]]
  if (op === '()' && args.length === 2) {
    const [callee, list] = args
    // A function name isn't a dependency; a method's target is.
    if (Array.isArray(callee) && (callee[0] === '.' || callee[0] === '?.')) {
      collectDependencies(callee[1] as Node, into)
    }
    for (const arg of listItems(list)) collectDependencies(arg, into)
    return
  }
  for (const arg of args) if (arg !== undefined && arg !== null) collectDependencies(arg, into)
}

// The dotted path of a chain of property reads, or undefined if `node` isn't
// one. A computed index's own dependencies go into `into`.
function memberPath(node: Node, into: Set<string>): string | undefined {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return undefined
  if (node[0] === '.' || node[0] === '?.') {
    const base = memberPath(node[1] as Node, into)
    if (base === undefined) return undefined
    return node[2] === 'length' ? base : `${base}.${node[2] as string}`
  }
  if ((node[0] === '[]' || node[0] === '?.[]') && node.length === 3) {
    const base = memberPath(node[1] as Node, into)
    if (base === undefined) return undefined
    const index = node[2] as Node
    if (isLiteral(index)) return `${base}.${String(index[1])}`
    collectDependencies(index, into)
    return `${base}.*`
  }
  return undefined
}

// subscript reports a position as "at line:column"; turn it into an offset.
function errorPosition(source: string, message: string): number | undefined {
  const match = /at (\d+):(\d+)/.exec(message)
  if (!match) return undefined
  const lines = source.split('\n').slice(0, Number(match[1]) - 1)
  return lines.reduce((offset, line) => offset + line.length + 1, 0) + Number(match[2]) - 1
}

export const jsLanguage: ExpressionLanguage = {
  name: 'js',
  compile(source) {
    let ast: Node
    try {
      ast = parse(source)
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0]! : String(error)
      throw new ExpressionError(message, errorPosition(source, message))
    }
    if (ast === '') throw new ExpressionError('The expression is empty', 0)

    const evaluate = compileNode(ast)
    const dependencies = new Set<string>()
    collectDependencies(ast, dependencies)
    return { evaluate, dependencies: [...dependencies] }
  },
}
