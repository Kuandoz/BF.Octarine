# Storybook

The component explorer and documentation site for Octarine.

```sh
pnpm storybook         # builds tokens, theme and icons, then serves on http://localhost:6006
pnpm build-storybook   # static site in apps/storybook/storybook-static
```

What's in it:

- **Introduction** and **Packages**: what Octarine is, how to set up an app, and every package's
  README.
- **Foundations**: colors, typography, spacing, themes and icons, generated from the tokens.
- **Components**: one page per component from `packages/vue/src/**/*.stories.ts`, with its props
  (from the components' doc comments), variants and states.
- **Forms**: the anatomy of a field, and the form engine rendering JSON forms with Octarine's
  components.

The toolbar switches theme, light or dark mode, and language. The a11y addon (axe) runs on every
story; it must report no violations in any theme or mode.

## Adding pages

- Component stories live next to their component in `packages/vue`.
- Pages that aren't about one component (MDX docs, cross-package stories) live in `src/`.
- A package's page in **Packages** shows its `README.md`, so documentation is written once.
