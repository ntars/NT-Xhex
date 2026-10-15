/**
 * NT-Xhex 玄玖灵犀 · uni-app Vue3 入口
 * 初始化 Vue 实例，挂载根组件。
 */
import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
