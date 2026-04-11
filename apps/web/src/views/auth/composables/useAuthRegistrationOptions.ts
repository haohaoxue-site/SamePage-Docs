import type { AuthRegistrationOptionsDto } from '@/apis/auth'
import { computed, shallowRef } from 'vue'
import { getAuthRegistrationOptions } from '@/apis/auth'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useAuthRegistrationOptions() {
  const registrationOptions = shallowRef<AuthRegistrationOptionsDto | null>(null)
  const loadErrorMessage = shallowRef('')
  const isLoadingOptions = shallowRef(false)
  const allowPasswordRegistration = computed(() => registrationOptions.value?.allowPasswordRegistration ?? false)

  async function loadRegistrationOptions() {
    isLoadingOptions.value = true
    loadErrorMessage.value = ''

    try {
      registrationOptions.value = await getAuthRegistrationOptions()
    }
    catch (error) {
      loadErrorMessage.value = getRequestErrorDisplayMessage(error, '加载注册配置失败')
    }
    finally {
      isLoadingOptions.value = false
    }
  }

  return {
    allowPasswordRegistration,
    isLoadingOptions,
    loadErrorMessage,
    loadRegistrationOptions,
    registrationOptions,
  }
}
