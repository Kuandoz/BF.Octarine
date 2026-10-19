import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }

const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)].map(
  (dep) => new RegExp(`^${dep}(/.*)?$`),
)

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    // Keep class strings readable: consumers point Tailwind's `@source` at dist/.
    minify: false,
    rolldownOptions: { external },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
})
