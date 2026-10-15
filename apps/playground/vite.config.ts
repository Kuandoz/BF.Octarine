import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Serve the brand assets (favicon, logos) from the repo root.
  publicDir: '../../assets/brand',
})
