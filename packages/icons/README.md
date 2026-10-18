# @octarine/icons

Icons as plain data, with no framework code:

- the [Heroicons](https://heroicons.com) set (MIT), in four variants: `outline`, `solid`, `mini`
  (20px) and `micro` (16px);
- Octarine's own icons (`octarine:*`), like the logo mark;
- a **Vite plugin**, `octarineIcons()`, that bundles only the icons your source uses.

SVGs are converted and sanitised at build time. Nothing renders SVG strings at runtime.

## Using it with `@octarine/vue`

```ts
// vite.config.ts
import { octarineIcons } from '@octarine/icons/vite'
export default defineConfig({ plugins: [vue(), tailwindcss(), octarineIcons()] })

// main.ts
import { createIcons } from '@octarine/vue'
import icons from 'virtual:octarine-icons'
createApp(App).use(createIcons(icons)).mount('#app')
```

```vue
<OIcon name="trash" variant="solid" intent="danger" />
<OButton icon="plus">New</OButton>
```

The plugin scans your source for quoted icon names, the way Tailwind finds class names, and
bundles them as `virtual:octarine-icons`. So write names out in full and never build them from
parts. A variant is bundled for a name when the variant's string is in the same file.

### Plugin options

```ts
octarineIcons({
  content: ['src'], // where to look for names (default: ['src'])
  custom: { app: 'src/icons' }, // src/icons/invoice.svg becomes app:invoice
  safelist: ['trash/solid', 'app:invoice'], // always bundled
  dts: 'src/octarine-icons.d.ts', // types `name` with every icon; false to turn off
})
```

The generated `.d.ts` makes `name` autocomplete and turns a typo into a type error. Commit it.

Your own one-color SVGs follow `currentColor`; gradients and multi-color icons (logos) keep their
colors.

## Without the plugin

Import icon definitions directly. This is how components inside `@octarine/vue` use icons, so they
never depend on the app's plugin:

```ts
import { trash } from '@octarine/icons/heroicons/solid'
import { mark } from '@octarine/icons/octarine'
```

```vue
<OIcon :icon="trash" />
```

| Export                                                 | Contents                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `@octarine/icons/heroicons/{outline,solid,mini,micro}` | One named export per icon (`trash`, `xMark`, …).                             |
| `@octarine/icons/octarine`                             | Octarine's own icons.                                                        |
| `@octarine/icons/vite`                                 | The `octarineIcons()` plugin.                                                |
| `@octarine/icons/virtual`                              | Types for `virtual:octarine-icons`.                                          |
| `@octarine/icons`                                      | The `IconDefinition` types, the SVG converter (`svgToIcon`) and the scanner. |

An icon is `{ viewBox, attrs, nodes }`: a tree of plain elements, rendered by `OIcon`.

## Accessibility

Icons are decorative (`aria-hidden`) unless they get a `label`. Icon-only buttons need an
`aria-label`. Color comes from the text color (`currentColor`), and an icon's color must never be
the only way something is shown.

## Changing the icon set

Add an `IconSetSource` in `scripts/sets/` that maps the vendor's names and styles onto Octarine
names and variants; templates don't change. Octarine's own icons are the SVGs in `svg/`, plus the
brand mark from `assets/brand`.

```sh
pnpm --filter @octarine/icons build
pnpm --filter @octarine/icons test
```

Storybook's **Foundations/Icons** page lists every icon.
