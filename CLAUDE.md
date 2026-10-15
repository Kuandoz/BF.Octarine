# CLAUDE.md

Octarine is a Vue 3 + Tailwind CSS v4 design system in a pnpm monorepo. See `README.md` for the
full overview.

## Layout

```
packages/tokens    → design tokens + themes (TS source of truth → tokens.css, themes/*.css, tokens.json)
packages/tailwind  → Tailwind @theme generated from tokens + base styles/utilities
packages/icons     → icon data (Heroicons + octarine:*), SVG converter, Vite plugin (octarineIcons)
packages/vue       → Vue components (one folder per component: .vue, .stories.ts, .spec.ts, index.ts)
apps/storybook     → Storybook 10 (component stories + Foundations MDX pages)
apps/playground    → demo app consuming the *built* packages
assets/brand       → Octarine logos (SVG)
```

Each layer may only depend on the layers above it in this list; `icons` depends on nothing.
`tokens` and `icons` contain no Tailwind or Vue code. Components use no raw color values.

## Commands

pnpm may not be on PATH; prefix with `npx pnpm` if `pnpm` is not found.

```sh
pnpm install
pnpm build            # all packages (tokens → tailwind, icons → vue)
pnpm build:foundation # tokens + tailwind + icons (needed after token or icon changes)
pnpm test             # contrast spec (every theme × mode), icons + Vitest component specs
pnpm typecheck
pnpm storybook        # dev server on :6006
pnpm format           # Prettier
```

Before considering work done, `pnpm build`, `pnpm test` and `pnpm typecheck` must pass.

## Conventions

- **Colors:** components use semantic colors (`bg-surface`, `text-fg-muted`, `bg-danger-subtle`), never
  primitives (`bg-red-600`). Dark mode is token-driven, so don't use `dark:` classes in components.
- **Themes:** themes are pluggable (`packages/tokens/src/themes/`, activated with `data-theme`;
  light/dark is `data-mode`). Every theme fills exactly the same tokens, so components must not
  hard-code what a theme decides: control heights, padding, radius, border width, shadows and
  text case come from component tokens (`min-h-(--oct-control-height-md)`, `px-(--oct-control-px-md)`,
  `rounded-control`, `rounded-card`, `theme-border`, `shadow-card`, `--oct-button-transform`, …).
  To add a theme, add a `Theme` file and register it in `themes/index.ts`; the build and the
  contrast spec pick it up.
- **Typography:** use text-style utilities (`text-heading-2`, `text-body`, `text-caption`) instead of
  combining size, leading and weight by hand. They also set the family and case per theme, so
  don't add `font-display`, `font-mono` or `uppercase` next to them.
- **Icons:** use `OIcon` (or an `icon` prop) and never inline SVG markup in components.
  - Apps use names (`<OIcon name="trash" variant="solid">`). The `octarineIcons()` Vite plugin
    bundles only names it finds as quoted strings in the source, so write names out in full, like
    class names. A variant is bundled when its string is in the same file as the name; otherwise add
    `name/variant` to the plugin's `safelist`.
  - Components inside `packages/vue` import icon definitions
    (`import { xMark } from '@octarine/icons/heroicons/mini'`) and pass them as `:icon`, so they
    never depend on the consumer's plugin.
  - Icon data is converted and sanitized at build time. Never render SVG strings at runtime
    (`v-html`, `DOMParser`).
  - Color comes from `intent` (`currentColor`), never from fills. Disabled is `icon-disabled`.
    Size and stroke width come from theme tokens.
  - Icons are decorative (`aria-hidden`) unless they get a `label`. Icon-only buttons need an
    `aria-label`.
- **Variants:** define them with `cva` and write every class name out in full, because Tailwind
  scans the source. Never build class names with string interpolation.
- **Class merging:** root elements use `useClasses()` with `defineOptions({ inheritAttrs: false })`
  so consumer classes override defaults.
- **New components:** prefix with `O`, place under the correct category
  (`foundations`, `actions`, `forms`, `feedback`, `layout`), and export from
  `packages/vue/src/components/index.ts`. Every component needs a story and a spec.
- **Token changes:** edit `packages/tokens/src` (global primitives, or a theme in `themes/`), and
  map any new Tailwind namespace in `packages/tailwind/scripts/build-theme.ts`.
- **Commits:** use Conventional Commits (`feat(vue): …`, `fix(tokens): …`, `docs: …`), scoped to
  the package.

## Accessibility: WCAG 2.2 AA is mandatory

Everything in this repo (tokens, components, Storybook docs, playground) must conform to
**WCAG 2.2 Level AA**. A change that introduces a violation is not done, even if it builds and tests
pass. If a request would conflict with this rule, say so rather than silently complying.

### Color & contrast (tokens)

- Text needs at least **4.5:1** contrast against its background. Large text (≥ 24px, or ≥ 18.66px bold)
  needs at least **3:1** (1.4.3).
- UI component boundaries, focus indicators, icons and meaningful graphics need at least **3:1**
  against adjacent colors (1.4.11). This includes input borders and outline-button/badge borders.
- Every semantic pairing is checked in **every theme, light and dark**, by
  `packages/tokens/src/contrast.spec.ts`. When a component starts using a new color combination, add
  that pair to the spec.
- `border` is for decorative dividers only. Anything that identifies a control (input, outline
  button) uses `border-strong`.
- `warning` is not a text color (it can't reach 4.5:1 on light surfaces); use `text-warning-subtle-fg`.
- Disabled controls are exempt from contrast, but must still be identifiable as disabled.
- Never convey meaning by color alone (1.4.1). Errors need text, and states need an icon,
  text or shape as well.

### Components

- **Semantic HTML first:** use `<button>` for actions, `<a href>` for navigation, and native form
  controls. Only use ARIA when no native element fits, and then follow the WAI-ARIA Authoring
  Practices pattern for that widget.
- **Keyboard:** everything interactive is reachable and operable by keyboard, in a logical order.
  Don't use a positive `tabindex`, and don't create keyboard traps (2.1.1, 2.1.2, 2.4.3).
- **Focus:** a visible focus indicator is required (use `focus-ring` or an equivalent with ≥ 3:1
  contrast), and it must not be hidden by other content (2.4.7, 2.4.11).
- **Names:** every control has an accessible name. Icon-only buttons need `aria-label` (4.1.2, 2.5.3).
- **Forms:**
  - Every input has a programmatic label; use `OField`.
  - Hints and errors are linked with `aria-describedby`, and invalid fields get `aria-invalid`.
  - Required fields are marked both visually and programmatically (1.3.1, 3.3.1, 3.3.2).
- **Target size:** pointer targets are at least **24×24 CSS px**, or have enough spacing (2.5.8).
- **Status messages:** loading, success and error announcements use `role="status"` or
  `role="alert"` / live regions (4.1.3).
- **Motion:** respect `prefers-reduced-motion` (use `motion-safe:` / `motion-reduce:`). Nothing
  flashes more than 3 times per second (2.3.1).
- **Resize & reflow:**
  - Use `rem`-based sizes, and don't use fixed heights that clip text.
  - Content works at 200% zoom and at 320px width without horizontal scrolling (1.4.4, 1.4.10).
  - Text-spacing overrides must not break layouts (1.4.12).
- **Hover/focus content** (tooltips, popovers) can be dismissed, can be hovered, and stays visible
  until dismissed (1.4.13).
- **Language:** apps set `<html lang>` (3.1.1).

### Verification

- The Storybook a11y addon (axe) must report **no violations** for any story, in every theme, light
  and dark.
- Specs assert the accessibility contract: roles, accessible names, `aria-*` wiring and keyboard
  behavior, not just classes.
- Automated checks catch only part of WCAG. For new interactive components, also check
  keyboard-only use and screen-reader announcements manually, and mention what was checked.
