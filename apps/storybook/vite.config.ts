import { octarineIcons } from '@octarine/icons/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // Bundle the icons the stories and components use (virtual:octarine-icons).
    octarineIcons({ content: ['src', '../../packages/vue/src'] }),
  ],
})
