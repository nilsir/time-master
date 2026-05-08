import { createApp, h } from 'vue'
import App from '@/App.vue'
import '@/styles/global.css'
import './standalone.css'

createApp({
  render: () => h(App, { mode: 'standalone' }),
}).mount('#app')
