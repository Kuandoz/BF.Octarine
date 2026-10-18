# @octarine/vue

Octarine's Vue 3 components. They are styled only with the [`@octarine/tailwind`](../tailwind)
theme, so they follow the active theme and dark mode, and they meet WCAG 2.2 AA.

## Setting up

```ts
// vite.config.ts
import { octarineIcons } from '@octarine/icons/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ plugins: [vue(), tailwindcss(), octarineIcons()] })
```

```css
/* src/style.css */
@import '@octarine/tailwind';
@import '@octarine/tokens/themes/all.css';
@source '../node_modules/@octarine/vue/dist';
```

```ts
// main.ts
import { createIcons } from '@octarine/vue'
import icons from 'virtual:octarine-icons'
import './style.css'

createApp(App).use(createIcons(icons)).mount('#app')
```

Then import what you use:

```vue
<script setup lang="ts">
import { OButton, OField, OInput } from '@octarine/vue'
</script>

<template>
  <OField label="Email" hint="We never share it.">
    <OInput type="email" autocomplete="email" />
  </OField>
  <OButton icon="paper-airplane">Send</OButton>
</template>
```

`app.use(Octarine)` registers every component globally, for prototypes. Named imports keep the
bundle small.

## Components

| Category    | Components                                                |
| ----------- | --------------------------------------------------------- |
| Foundations | `OText`, `OHeading`, `OStack`, `OIcon`, `OIconLayers`     |
| Actions     | `OButton`                                                 |
| Forms       | `OForm`, `OField`, `OFieldset`, `OControlFrame`, `OInput` |
| Feedback    | `OBadge`, `OErrorSummary`, `OSpinner`                     |
| Layout      | `OCard`                                                   |

Every component has a page in Storybook with its props, variants and states.

## Composables

| Composable         | What it does                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `useTheme()`       | Reads and sets the theme (`<html data-theme>`) and loads the theme's web fonts.                     |
| `useColorMode()`   | Light, dark or system (`<html data-mode>`), with `toggle()`.                                        |
| `useMessages()`    | The words Octarine adds itself ("(optional)", "Clear", "Error:"), in the current language.          |
| `createMessages()` | A plugin that adds or changes those words: `app.use(createMessages({ es: { … } }))`.                |
| `createIcons()`    | A plugin that registers the icons from `virtual:octarine-icons`.                                    |
| `useFormField()`   | For your own controls: the id, state and `aria-describedby` that the surrounding `OField` provides. |
| `useClasses()`     | Merges a consumer's `class` over a component's own classes (`tailwind-merge`).                      |
| `cva`, `cn`        | The variant and class helpers the components use.                                                   |

## Forms

Wrap fields in `OForm` (required markers, language), each control in `OField` (label, hint,
error, counter), and groups of controls in `OFieldset` (legend). `OErrorSummary` lists the errors at
the top after a failed submit and links to each field. Storybook's **Forms/Anatomy** page shows every
part and its accessibility rules.

The words Octarine adds follow the `OForm`'s `lang`, else `<html lang>`. English, Dutch, French and
German are built in.

To build a control of your own, draw its box with `OControlFrame`, mark the native element
`data-control`, and get id, state and `aria-describedby` from `useFormField()`.

## Writing components

Each component has its own folder under `src/components/<category>/O<Name>/`, with the `.vue`
file, a story, a spec and an `index.ts`. It is exported from `src/components/index.ts`. The rules
(semantic colors only, `cva` with class names written out, `useClasses()`, icons as imports, and the
accessibility contract) are in the repository's `CLAUDE.md`.

```sh
pnpm --filter @octarine/vue build      # dist/ (JS + types)
pnpm --filter @octarine/vue test       # Vitest specs: roles, names, aria wiring, keyboard
pnpm --filter @octarine/vue typecheck
```
