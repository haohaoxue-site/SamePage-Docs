import type { AppearancePreference, LanguagePreference } from '@haohaoxue/samepage-domain'
import { ElMessage } from 'element-plus'
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useUserSettingsPreference() {
  const userStore = useUserStore()
  const isSavingLanguage = computed(() => userStore.isSavingLanguage)
  const isSavingAppearance = computed(() => userStore.isSavingAppearance)
  const languagePreference = computed<LanguagePreference>({
    get: () => userStore.preferences.language,
    set: (value) => {
      void saveLanguagePreference(value)
    },
  })
  const appearancePreference = computed<AppearancePreference>({
    get: () => userStore.preferences.appearance,
    set: (value) => {
      void saveAppearancePreference(value)
    },
  })

  async function saveLanguagePreference(value: LanguagePreference) {
    try {
      await userStore.updateLanguagePreference(value)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存语言偏好失败'))
    }
  }

  async function saveAppearancePreference(value: AppearancePreference) {
    try {
      await userStore.updateAppearancePreference(value)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存外观偏好失败'))
    }
  }

  return {
    isSavingLanguage,
    isSavingAppearance,
    languagePreference,
    appearancePreference,
  }
}
