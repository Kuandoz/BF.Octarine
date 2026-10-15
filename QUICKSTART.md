# Quickstart

Get Octarine running and build a first screen with it. For how the packages fit together, see
[README.md](README.md).

## 1. Run the repo

Requires Node 22+ and [pnpm](https://pnpm.io). If `pnpm` isn't on your PATH, prefix the commands
with `npx pnpm`.

```sh
pnpm install
pnpm storybook    # every component, in every theme, on http://localhost:6006
pnpm playground   # a small demo app that uses the built packages
```

## 2. Add an app

The packages aren't published to npm yet, so an app lives in the workspace under `apps/`. The
quickest start is to copy `apps/playground`. To set one up by hand:

**`apps/my-app/package.json`**

```json
{
  "name": "@octarine/my-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build"
  },
  "dependencies": {
    "@octarine/icons": "workspace:*",
    "@octarine/tailwind": "workspace:*",
    "@octarine/tokens": "workspace:*",
    "@octarine/vue": "workspace:*",
    "vue": "^3.5.43"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-vue": "^6.0.10",
    "tailwindcss": "^4.3.3",
    "typescript": "~6.0.3",
    "vite": "^8.3.4",
    "vue-tsc": "^3.3.13"
  }
}
```

**`vite.config.ts`**: `octarineIcons()` bundles only the icons your source uses.

```ts
import { octarineIcons } from '@octarine/icons/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss(), octarineIcons()],
})
```

**`src/style.css`**: Octarine's Tailwind theme, the themes, and the component classes.

```css
@import '@octarine/tailwind';
@import '@octarine/tokens/themes/all.css'; /* or one theme, e.g. themes/prism.css */
@source '../node_modules/@octarine/vue/dist';
```

**`src/main.ts`**

```ts
import { createIcons } from '@octarine/vue'
import icons from 'virtual:octarine-icons'
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).use(createIcons(icons)).mount('#app')
```

**`index.html`** needs a `lang` attribute (WCAG 3.1.1):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My app</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Give `tsconfig.json` the same setup as the playground's (`extends: ../../tsconfig.base.json`,
`types: ["vite/client"]`). Then build the packages once and start the app:

```sh
pnpm install
pnpm build
pnpm --filter @octarine/my-app dev
```

The first `dev` or `build` writes `src/octarine-icons.d.ts`. Commit it: it types
`virtual:octarine-icons` and the icon names.

## 3. Build a screen

**`src/App.vue`**

```vue
<script setup lang="ts">
import {
  OButton,
  OCard,
  OField,
  OHeading,
  OInput,
  OStack,
  useColorMode,
  useTheme,
} from '@octarine/vue'
import { ref } from 'vue'

const { theme, themes } = useTheme() // sets <html data-theme>, loads the theme's fonts
const { resolved, toggle } = useColorMode() // sets <html data-mode>, follows the OS by default
const email = ref('')
</script>

<template>
  <main class="mx-auto max-w-xl px-4 py-12">
    <OCard>
      <OStack :gap="4">
        <OHeading :level="1">Sign up</OHeading>
        <OField label="Email" hint="We never share it." required>
          <OInput v-model="email" type="email" />
        </OField>
        <OStack direction="horizontal" :gap="2">
          <OButton icon-end="paper-airplane">Subscribe</OButton>
          <OButton
            variant="outline"
            intent="neutral"
            :icon="resolved === 'dark' ? 'sun' : 'moon'"
            aria-label="Toggle dark mode"
            @click="toggle"
          />
        </OStack>
      </OStack>
    </OCard>
  </main>
</template>
```

- **Themes:** `theme.value = 'prism'` switches the theme; `themes` lists the five that ship
  (`octarine`, `vellum`, `circuit`, `hearth`, `prism`). Both theme and mode are remembered in
  `localStorage`.
- **Icons:** any [Heroicons](https://heroicons.com) name works, in `outline` (default), `solid`,
  `mini` or `micro`: `<OIcon name="trash" variant="solid" intent="danger" />`. Write names out in
  full; the plugin finds them like Tailwind finds classes. See [README › Icons](README.md#icons)
  for the safelist, your own SVGs and `OIconLayers`.
- **Styling:** use semantic utilities (`bg-surface`, `text-fg-muted`, `text-heading-2`), never
  primitives like `bg-red-600` or `dark:` classes. Themes and dark mode then work without extra
  code.

## 4. Before you ship

- Run `pnpm build`, `pnpm test` and `pnpm typecheck`.
- Everything must meet **WCAG 2.2 AA**: labels on every input (use `OField`), an `aria-label` on
  icon-only buttons, and meaning that never depends on color alone. The full rules are in
  [CLAUDE.md](CLAUDE.md#accessibility-wcag-22-aa-is-mandatory).
- Contributing a component or token? See [README › Adding a component](README.md#adding-a-component).
