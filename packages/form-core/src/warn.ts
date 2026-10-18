const warned = new Set<string>()

/**
 * Warns once per message. A library build can't tell development from
 * production (`import.meta.env.DEV` is fixed when the package is built), so
 * these always run, and once is enough for a problem in the form definition.
 */
export function warnOnce(message: string, ...details: unknown[]): void {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message, ...details)
}
