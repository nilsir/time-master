import { createApp, h } from 'vue'
import App from '@/App.vue'
import '@/styles/global.css'
import './popup.css'

createApp({
  render: () => h(App, { mode: 'popup' }),
}).mount('#app')
