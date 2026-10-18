# Octarine

A design system built with Vue 3 and Tailwind CSS v4, split into layered packages:

```
@octarine/tokens  ──►  @octarine/tailwind  ──┐
                                            ├──►  @octarine/vue  ──►  apps (storybook, playground)
@octarine/icons  ───────────────────────────┘

@octarine/form-engine   (Vue only, no styling)
```

Each layer depends only on the layers to its left. `@octarine/icons` depends on nothing, and
`@octarine/form-engine` only on Vue.

| Package                                         | What it holds                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@octarine/tokens`](packages/tokens)           | The source of truth, with no framework code. Global **primitives** (type scale, spacing), **semantic** token names (`surface`, `fg-muted`, `primary`, text styles) and the **themes** that fill them. Builds to `tokens.css` (default theme), `themes/*.css` and `tokens.json`. |
| [`@octarine/tailwind`](packages/tailwind)       | Maps the tokens onto Tailwind's `@theme`, plus base styles and shared utilities. Consumers import this instead of `tailwindcss`.                                                                                                                                                |
| [`@octarine/icons`](packages/icons)             | Icons as plain data: the [Heroicons](https://heroicons.com) set (MIT) in four variants, Octarine's own icons (`octarine:*`) and a **Vite plugin** that bundles only the icons the source uses. No framework code.                                                               |
| [`@octarine/form-engine`](packages/form-engine) | Renders forms from a JSON definition: reactive model, validation, expression-based conditions, localisation and lists. Headless: field components register themselves by `type`.                                                                                                |
| [`@octarine/vue`](packages/vue)                 | Vue components styled only with theme utilities. Each component lives in its own folder with its story and tests.                                                                                                                                                               |
| [`apps/storybook`](apps/storybook)              | Component explorer and documentation: an introduction, every package's README, Foundations pages generated from the tokens, a docs page per component, and the form engine rendering JSON forms.                                                                                |
| [`apps/playground`](apps/playground)            | A small app that uses the _built_ packages the way an external project would.                                                                                                                                                                                                   |
| [`assets/brand`](assets/brand)                  | Octarine logos and mark (SVG).                                                                                                                                                                                                                                                  |

## Getting started

Every package and app has a `README.md` saying what it does and how to use it. Storybook shows the
same READMEs under **Packages**, next to the component docs.

New here? [QUICKSTART.md](QUICKSTART.md) walks you from install to a first screen in your own app.

Requires Node 22+ and [pnpm](https://pnpm.io) (`npm i -g pnpm`, or prefix commands with `npx pnpm`).

```sh
pnpm install
pnpm storybook        # builds tokens + theme, then starts Storybook on :6006
pnpm playground       # builds all packages, then starts the playground
pnpm test             # component tests (Vitest)
pnpm typecheck
pnpm build            # builds every package in packages/
```

## Using it in an app

```ts
// vite.config.ts
import { octarineIcons } from '@octarine/icons/vite'
export default defineConfig({ plugins: [vue(), tailwindcss(), octarineIcons()] })

// main.ts
import { createIcons } from '@octarine/vue'
import icons from 'virtual:octarine-icons'
createApp(App).use(createIcons(icons)).mount('#app')
```

```css
/* src/style.css */
@import '@octarine/tailwind';
@import '@octarine/tokens/themes/all.css'; /* or just the themes you use, e.g. themes/prism.css */
@source '../node_modules/@octarine/vue/dist';
```

```vue
<script setup lang="ts">
import { OButton, OField, OInput, useColorMode, useTheme } from '@octarine/vue'
const { theme } = useTheme() // sets <html data-theme>, loads the theme's Google Fonts
const { toggle } = useColorMode() // sets <html data-mode>
</script>

<template>
  <OField label="Email" hint="We never share it.">
    <OInput type="email" />
  </OField>
  <OButton icon="moon" @click="toggle">Toggle dark mode</OButton>
</template>
```

## Themes

Octarine ships five pluggable themes. Each one fills exactly the same tokens (palettes, semantic
colors, fonts, text styles, radius, shadows, motion and component density), so every component works
under any of them. All of them meet WCAG 2.2 AA in light and dark.

| Theme      | Style                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| `octarine` | The default: Inter on cool greys with the octarine purple.                       |
| `vellum`   | Calm & editorial: Fraunces / Source Sans 3, logo blue, sharp corners, roomy.     |
| `circuit`  | Crisp & technical: Space Grotesk / IBM Plex, logo cyan, compact 32px controls.   |
| `hearth`   | Soft & friendly: Bricolage Grotesque / Nunito, sky blue, pill buttons.           |
| `prism`    | Bold & expressive: Unbounded / Manrope, logo violet, 2px outlines, hard shadows. |

Set `data-theme="<name>"` and `data-mode="dark"` (or class `dark`) on `<html>` or on any subtree.
The four directions come from the Octarine design system in Claude Design; their palettes derive
from the logo gradient.

To add a theme, write a `Theme` in `packages/tokens/src/themes/` and register it in
`themes/index.ts`. The build emits its CSS and the contrast spec checks it.

## Icons

```vue
<OIcon name="trash" variant="solid" intent="danger" disabled />
<OIcon name="octarine:mark" size="lg" label="Octarine" />
<OButton icon="plus">New</OButton>
<OButton :icon="{ name: 'trash', variant: 'mini' }" intent="danger">Delete</OButton>
<OButton icon="cog-6-tooth" aria-label="Settings" />
```

- **Finding icons:** the `octarineIcons()` Vite plugin scans `src` for quoted icon names, the way
  Tailwind finds classes, and bundles only those as `virtual:octarine-icons`. Remove the last use
  and the icon leaves the bundle. Write names out in full; never build them from parts.
- **Variants** are `outline` (default), `solid`, `mini` and `micro`. A variant is bundled for a name
  when the variant string appears in the same file. A name and variant that only meet across files
  go in the plugin's `safelist` (`'trash/solid'`). A missing icon shows a dashed square and a
  console warning.
- **Types:** the plugin writes `src/octarine-icons.d.ts` (commit it), so `name` autocompletes and a
  typo fails `typecheck`.
- **Imports instead of names:** `import { trash } from '@octarine/icons/heroicons/solid'` with
  `<OIcon :icon="trash" />` needs no plugin. Components inside `@octarine/vue` always do this.
- **Your own icons:** `octarineIcons({ custom: { app: 'src/icons' } })` turns
  `src/icons/invoice.svg` into `app:invoice`. SVGs are sanitized at build time. One-color icons
  follow `currentColor`; gradients and multi-color icons (logos) keep their colors.
- **Passing icons around:** `icon` props take a name, an imported icon or a full set of `OIcon`
  props, so `<OIcon v-bind="spec" />` and `<OButton :icon="spec" />` take the same object.
- **Layers:** `OIconLayers` stacks `OIcon`s, each placed with `transform` (`scale`, `x`, `y`,
  `rotate`, `flipX`, `flipY`).
- **Theming:** icon sizes, the outline stroke width and the disabled opacity are theme tokens.
- **Accessibility:** icons are hidden from assistive tech unless they have a `label`. Icon-only
  buttons need an `aria-label`. Never rely on an icon's color alone.
- **Changing the icon set:** add an `IconSetSource` in `packages/icons/scripts/sets/` that maps the
  vendor's names and styles onto Octarine names and variants. Templates don't change.

## Forms

```vue
<OForm markers="both" @submit.prevent="save">
  <OField label="Name" required>
    <OInput v-model="name" autocomplete="name" />
  </OField>
  <OField label="Website" hint="Shown on your profile." :max-length="60">
    <OInput v-model="site" icon="globe-alt" prefix="https://" clearable />
  </OField>
  <OFieldset legend="Date of birth" :error="dateError">…</OFieldset>
</OForm>
```

- **Anatomy:** label (with `*` or `(optional)`), an optional `#label-action`, the hint _above_ the
  control, the control frame with its adornments, then the error (as well as the hint) and the
  counter. Storybook's **Forms/Anatomy** page shows every part and its accessibility rules.
- **Markers:** `OForm`'s `markers` is `required` (default: `*`, plus a note explaining it),
  `optional` or `both`. A field or group can override it.
- **Languages:** the words Octarine adds follow the `OForm`'s `lang`, else `<html lang>`. English,
  Dutch, French and German are built in; add or change others with
  `app.use(createMessages({ es: { optional: '(opcional)', … } }))`.
- **Your own controls** draw their box with `OControlFrame` and get id, state and
  `aria-describedby` from `useFormField()`.

## Conventions

- **Use semantic colors in components** (`bg-surface`, `text-fg-muted`, `bg-danger-subtle`) and avoid primitives.
  Themes and dark mode work by redefining tokens under `[data-theme]` / `[data-mode='dark']`, so
  components never need `dark:` classes.
- **Use text styles instead of hand-mixed typography.** `text-heading-2`, `text-body`, `text-caption`, … each
  set size, line height, weight and letter spacing together.
- **Use the Tailwind theme only.** The default Tailwind palette, fonts, sizes, radii and shadows are
  turned off, so `bg-blue-500` only works because `blue` is an Octarine palette.
- **Components**
  - Use the `O` prefix and put each component in its own folder:
    `OButton/{OButton.vue, OButton.stories.ts, OButton.spec.ts, index.ts}`, grouped by category
    (`foundations`, `actions`, `forms`, `feedback`, `layout`).
  - Define variants with `cva`, and write class names out in full so Tailwind can find them.
  - Merge consumer classes through `useClasses()`, so `<OButton class="rounded-full">` overrides
    `rounded-control` instead of conflicting with it.

## Adding a token

1. Add or change it in `packages/tokens/src/{primitives,semantic}`. A value that differs per theme
   goes in the `Theme` type and in every file under `themes/`.
2. If it belongs to a new Tailwind namespace, map it in `packages/tailwind/scripts/build-theme.ts`.
3. `pnpm build:foundation`. Storybook's Foundations pages pick it up automatically.

## Adding a component

1. Create `packages/vue/src/components/<category>/O<Name>/` with the `.vue` file, story, spec and `index.ts`.
2. Export it from `packages/vue/src/components/index.ts`.
