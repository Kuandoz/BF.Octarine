# @octarine/tokens

The design tokens of Octarine: the single source of truth for colors, typography, spacing,
radius, shadows, motion and component density. Plain TypeScript, with no Tailwind or Vue code, so
any stack can use it.

It holds three kinds of tokens:

- **Primitives**: global scales with no meaning attached (type sizes, weights, line heights,
  letter spacing, the spacing unit).
- **Semantic tokens**: names that say what a value is for: `surface`, `fg-muted`, `primary`,
  `danger-subtle`, `border-strong`, and text styles like `heading-2` and `body`.
- **Themes** fill the semantic tokens. There are five (`octarine`, the default, plus `vellum`,
  `circuit`, `hearth` and `prism`), each in light and dark. Every theme fills exactly the same
  tokens, so a component works in all of them.

## Using it

Most apps use the tokens through [`@octarine/tailwind`](../tailwind) and never import this package
directly. Add the themes you want next to it:

```css
@import '@octarine/tailwind';
@import '@octarine/tokens/themes/all.css'; /* or one theme: themes/prism.css */
```

Switch with attributes on `<html>` or on any subtree:

```html
<html data-theme="vellum" data-mode="dark"></html>
```

### What it builds

| Export                               | Contents                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `@octarine/tokens/tokens.css`        | CSS custom properties (`--oct-*`) for the primitives and the default theme. |
| `@octarine/tokens/themes/<name>.css` | One theme, under `[data-theme='<name>']`, light and dark.                   |
| `@octarine/tokens/themes/all.css`    | Every theme.                                                                |
| `@octarine/tokens/tokens.json`       | Every token as JSON, for other tools (design tools, native apps).           |
| `@octarine/tokens`                   | The tokens as TypeScript values.                                            |

### From TypeScript

```ts
import { contrastRatio, defaultTheme, themes, type ThemeName } from '@octarine/tokens'

themes.circuit.label // 'Circuit'
themes.circuit.fonts.href // its Google Fonts stylesheet
defaultTheme.name // 'octarine'
```

The package also exports the helpers the build uses: `themeToCss`, `cssVar`, and
`contrastRatio` / `relativeLuminance` for checking color pairs.

## Accessibility

`src/contrast.spec.ts` checks every semantic text and UI pairing in every theme, light and dark,
against WCAG 2.2 AA (4.5:1 for text, 3:1 for UI boundaries and large text). When a component starts
using a new color combination, add the pair to that spec.

## Changing tokens

- **A global value**: edit `src/primitives/` or `src/semantic/`.
- **A value that differs per theme**: add it to the `Theme` type in `src/theme.ts` and fill it in
  every file under `src/themes/`.
- **A new theme**: add a `Theme` file in `src/themes/` and register it in `src/themes/index.ts`. The
  build emits its CSS, and the contrast spec checks it.

A new Tailwind namespace also needs mapping in
[`@octarine/tailwind`](../tailwind)'s `scripts/build-theme.ts`.

```sh
pnpm --filter @octarine/tokens build   # dist/: JS, tokens.css, themes/*.css, tokens.json
pnpm --filter @octarine/tokens test    # the contrast spec
```

Storybook's **Foundations** pages (colors, typography, spacing, themes) are generated from these
tokens.
