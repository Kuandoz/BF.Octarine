import { circuit } from './circuit.js'
import { hearth } from './hearth.js'
import { octarine } from './octarine.js'
import { prism } from './prism.js'
import { vellum } from './vellum.js'

export { circuit, hearth, octarine, prism, vellum }

/** Every built-in theme, by name. Activate one with `data-theme="<name>"`. */
export const themes = { octarine, vellum, circuit, hearth, prism } as const

export type ThemeName = keyof typeof themes

/** Applies when no `data-theme` is set; its CSS ships in `tokens.css`. */
export const defaultTheme = octarine
