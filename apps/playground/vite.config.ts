import { octarineIcons } from '@octarine/icons/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // Bundles only the icons the source uses, as virtual:octarine-icons.
  plugins: [vue(), tailwindcss(), octarineIcons()],
  // Serve the brand assets (favicon, logos) from the repo root.
  publicDir: '../../assets/brand',
})
