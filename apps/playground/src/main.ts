import { createIcons } from '@octarine/vue'
import icons from 'virtual:octarine-icons'
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).use(createIcons(icons)).mount('#app')
