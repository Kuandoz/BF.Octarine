import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }

const external = Object.keys(pkg.dependencies).map((dep) => new RegExp(`^${dep}(/.*)?$`))

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    minify: false,
    rolldownOptions: { external },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
