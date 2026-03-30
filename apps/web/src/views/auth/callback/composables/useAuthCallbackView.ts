import { onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadAdminRoutes, resetAdminRoutes } from '@/router'
import { useAuthStore } from '@/stores/auth'

export function useAuthCallbackView() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const statusLabel = shallowRef('正在完成登录...')
  const errorMessage = shallowRef('')

  async function handleCallback() {
    const code = typeof route.query.code === 'string' ? route.query.code.trim() : ''

    if (!code) {
      statusLabel.value = '登录失败'
      errorMessage.value = '缺少登录 code，无法完成身份交换。'
      return
    }

    try {
      await authStore.login(code)
      statusLabel.value = '登录成功，正在跳转...'

      if (authStore.isSystemAdmin) {
        loadAdminRoutes(router)
      }
      else {
        resetAdminRoutes(router)
      }

      const saved = authStore.consumeRedirect()
      const target = saved || { name: authStore.defaultRouteName }
      await router.replace(target)
    }
    catch (error) {
      statusLabel.value = '登录失败'
      errorMessage.value = error instanceof Error ? error.message : '登录失败'
    }
  }

  onMounted(handleCallback)

  return {
    statusLabel,
    errorMessage,
  }
}
