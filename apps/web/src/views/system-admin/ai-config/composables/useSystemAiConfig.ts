import type { SystemAiConfigDto } from '@/apis/system-admin'
import { ElMessage } from 'element-plus'
import { reactive, shallowRef } from 'vue'
import {
  getSystemAiConfig,
  updateSystemAiConfig,
} from '@/apis/system-admin'

export function useSystemAiConfig() {
  const currentConfig = shallowRef<SystemAiConfigDto | null>(null)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const isSaving = shallowRef(false)
  const form = reactive({
    enabled: false,
    baseUrl: '',
    defaultModel: '',
    apiKey: '',
    clearApiKey: false,
  })

  async function loadConfig() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const config = await getSystemAiConfig()
      currentConfig.value = config
      form.enabled = config.enabled
      form.baseUrl = config.baseUrl || ''
      form.defaultModel = config.defaultModel || ''
      form.apiKey = ''
      form.clearApiKey = false
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载系统 AI 配置失败'
    }
    finally {
      isLoading.value = false
    }
  }

  async function saveConfig() {
    isSaving.value = true

    try {
      currentConfig.value = await updateSystemAiConfig({
        enabled: form.enabled,
        baseUrl: form.baseUrl.trim() || undefined,
        defaultModel: form.defaultModel.trim() || undefined,
        apiKey: form.apiKey.trim() || undefined,
        clearApiKey: form.clearApiKey || undefined,
      })
      form.baseUrl = currentConfig.value.baseUrl || ''
      form.defaultModel = currentConfig.value.defaultModel || ''
      form.apiKey = ''
      form.clearApiKey = false
      ElMessage.success('系统 AI 配置已保存')
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存系统 AI 配置失败')
    }
    finally {
      isSaving.value = false
    }
  }

  return {
    currentConfig,
    errorMessage,
    form,
    isLoading,
    isSaving,
    loadConfig,
    saveConfig,
  }
}
