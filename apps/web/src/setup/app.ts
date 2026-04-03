import type { Component } from 'vue'
import ElementPlus from 'element-plus'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import { useAppearanceStore } from '@/stores/appearance'

export default function setupCreateApp(component: Component) {
  const app = createApp(component)

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)
  app.use(ElementPlus)
  app.runWithContext(() => {
    useAppearanceStore()
  })

  return app
}
