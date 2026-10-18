# Playground

A small Vite + Vue app that uses the **built** Octarine packages the way an external project
would: through their package exports, with the `octarineIcons()` plugin and the Tailwind setup from
[QUICKSTART.md](../../QUICKSTART.md). If something works in Storybook but not here, a package's
build or exports are wrong.

```sh
pnpm playground   # builds every package, then starts the dev server
```

It is also the quickest starting point for a new app: copy the folder, rename the package and
change `src/App.vue`.
