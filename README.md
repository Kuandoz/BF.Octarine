# Octarine

A design system built with Vue 3 and Tailwind CSS v4, split into layered packages:

```
@octarine/tokens  ──►  @octarine/tailwind  ──►  @octarine/vue  ──►  apps (storybook, playground)
```

Each layer depends only on the layers to its left.

| Package                                   | What it holds                                                                                                                                                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@octarine/tokens`](packages/tokens)     | The source of truth, with no framework code. **Primitives** (color scales, type scale, spacing, radius, shadow, motion) and **semantic** tokens (`surface`, `fg-muted`, `primary`, text styles). Builds to `tokens.css` (CSS variables) and `tokens.json`. |
| [`@octarine/tailwind`](packages/tailwind) | Maps the tokens onto Tailwind's `@theme`, plus base styles and shared utilities. Consumers import this instead of `tailwindcss`.                                                                                                                           |
| [`@octarine/vue`](packages/vue)           | Vue components styled only with theme utilities. Each component lives in its own folder with its story and tests.                                                                                                                                          |
| [`apps/storybook`](apps/storybook)        | Component explorer, plus Foundations pages (colors, typography, spacing) generated from the tokens.                                                                                                                                                        |
| [`apps/playground`](apps/playground)      | A small app that uses the _built_ packages the way an external project would.                                                                                                                                                                              |

## Getting started

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

```css
/* src/style.css */
@import '@octarine/tailwind';
@source '../node_modules/@octarine/vue/dist';
```

```vue
<script setup lang="ts">
import { OButton, OField, OInput, useTheme } from '@octarine/vue'
const { toggle } = useTheme()
</script>

<template>
  <OField label="Email" hint="We never share it.">
    <OInput type="email" />
  </OField>
  <OButton @click="toggle">Toggle theme</OButton>
</template>
```

## Conventions

- **Use semantic colors in components** (`bg-surface`, `text-fg-muted`, `bg-danger-subtle`) and avoid primitives.
  Dark mode works by redefining semantic tokens under `.dark` / `[data-theme='dark']`, so
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
    `rounded-md` instead of conflicting with it.

## Adding a token

1. Add or change it in `packages/tokens/src/{primitives,semantic}`.
2. If it belongs to a new Tailwind namespace, map it in `packages/tailwind/scripts/build-theme.ts`.
3. `pnpm build:foundation`. Storybook's Foundations pages pick it up automatically.

## Adding a component

1. Create `packages/vue/src/components/<category>/O<Name>/` with the `.vue` file, story, spec and `index.ts`.
2. Export it from `packages/vue/src/components/index.ts`.
