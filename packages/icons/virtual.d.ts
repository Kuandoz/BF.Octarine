/**
 * The registry the Vite plugin generates from the icons your source uses.
 * Referenced by the generated `octarine-icons.d.ts`, or add
 * `"types": ["@octarine/icons/virtual"]` to your tsconfig.
 */
declare module 'virtual:octarine-icons' {
  import type { IconRegistry } from '@octarine/icons'
  const icons: IconRegistry
  export default icons
}
