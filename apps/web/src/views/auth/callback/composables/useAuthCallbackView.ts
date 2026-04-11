import { onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'
import { completeAuthNavigation } from '../../utils/navigation'

export function useAuthCallbackView() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const statusLabel = shallowRef('正在完成登录...')
  const errorMessage = shallowRef('')

  async function handleCallback() {
    const code = typeof route.query.code === 'string' ? route.query.code.trim() : ''

    if (!code) {
      statusLabel.value = '登录信息无效'
      errorMessage.value = '缺少登录凭证，请重新发起登录。'
      return
    }

    try {
      await authStore.login(code)
      statusLabel.value = '登录成功，正在跳转...'
      await completeAuthNavigation(router, authStore)
    }
    catch (error) {
      statusLabel.value = '登录失败'
      errorMessage.value = getRequestErrorDisplayMessage(error, '登录失败')
    }
  }

  onMounted(handleCallback)

  return {
    statusLabel,
    errorMessage,
  }
}
