import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)
app.mount('#app')

/**
 * 手动引入Ant Design的vue工具（先下载），然后把全局完整注册放入main.ts进行注册，删除重复项 app.use(Antd)
 */
