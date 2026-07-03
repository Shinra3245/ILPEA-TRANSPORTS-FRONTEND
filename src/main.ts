import { createApp } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import './assets/base.css'
import './assets/tokens.css'
import './assets/crud-admin.css'

const app = createApp(App)
app.use(router)
app.use(MotionPlugin)
app.use(vuetify)
app.mount('#app')