# @octarine/tailwind

Octarine's Tailwind CSS v4 theme. It maps [`@octarine/tokens`](../tokens) onto Tailwind's `@theme`
variables, and adds base styles, text styles and a few shared utilities. Import it instead of
`tailwindcss`.

## Using it

```css
/* src/style.css */
@import '@octarine/tailwind';
@import '@octarine/tokens/themes/all.css'; /* the themes you use */
@source '../node_modules/@octarine/vue/dist'; /* so Tailwind sees the component classes */
```

`tailwindcss` (v4.3+) is a peer dependency, with `@tailwindcss/vite` in your Vite config.

## What you get

**Only Octarine's theme.** Tailwind's default palette, fonts, text sizes, radii and shadows are
turned off, so everything comes from the tokens and follows the active theme.

**Semantic colors**, which follow the theme and dark mode:

| Group    | Utilities (with `bg-`, `text-`, `border-`, …)                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Surfaces | `canvas`, `surface`, `surface-raised`, `surface-sunken`                                                             |
| Text     | `fg`, `fg-muted`, `fg-subtle`, `fg-inverse`                                                                         |
| Lines    | `border` (decorative dividers), `border-strong` (anything that identifies a control), `ring`                        |
| Intents  | `primary`, `neutral`, `info`, `success`, `warning`, `danger`, each with `-hover`, `-fg`, `-subtle` and `-subtle-fg` |

Palettes (`brand`, `neutral`, `blue`, `green`, `amber`, `red`, 50–950) exist too, but components use
the semantic names. `warning` isn't a text color; use `text-warning-subtle-fg`.

**Text styles** set size, line height, weight, letter spacing, family and case together:
`text-display`, `text-heading-1` … `text-heading-4`, `text-body-lg`, `text-body`, `text-body-sm`,
`text-label`, `text-caption`, `text-overline`, `text-code`.

**Theme-driven shapes**: `rounded-control`, `rounded-input`, `rounded-card`, `rounded-badge`,
`shadow-control`, `shadow-card`, and control sizes as variables (`min-h-(--oct-control-height-md)`,
`px-(--oct-control-px-md)`).

**Utilities**:

- `focus-ring`: the focus indicator (at least 3:1 against its surroundings).
- `theme-border`: the theme's border width.
- `transition-standard`: the theme's duration and easing.
- `icon`, `icon-sm`, `icon-md`, `icon-lg`, `icon-disabled`: icon sizes and stroke width from the
  theme.

**Base styles**: the page font, text and canvas colors, a visible `:focus-visible` outline, and
the selection color.

**Dark mode** follows `data-mode="dark"` (or class `dark`) instead of the OS preference, so the
app decides. Components don't need `dark:` classes, because the tokens switch underneath them.

## Separate files

The entry point imports these in order; each can be imported on its own:

`@octarine/tailwind/theme.css`, `text-styles.css`, `base.css`, `utilities.css`, `icons.css`.

## Building

`scripts/build-theme.ts` generates `dist/theme.css` and `dist/text-styles.css` from the tokens. A
new Tailwind namespace is mapped there.

```sh
pnpm --filter @octarine/tailwind build
```
