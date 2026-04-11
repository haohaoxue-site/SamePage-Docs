import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import type { SystemAiConfigDto } from '@/apis/system-admin'
import { ElMessage } from 'element-plus'
import { reactive, shallowRef } from 'vue'
import {
  getSystemAiConfig,
  updateSystemAiConfig,
} from '@/apis/system-admin'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useSystemAiConfig() {
  type RuleValidator = NonNullable<FormItemRule['validator']>

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
  const validateBaseUrl: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''

    if (!form.enabled && !normalizedValue) {
      callback()
      return
    }

    if (!normalizedValue) {
      callback(new Error('请输入 API 地址基准'))
      return
    }

    try {
      const parsedUrl = new URL(normalizedValue)
      void parsedUrl
    }
    catch {
      callback(new Error('请输入合法的 API 地址'))
      return
    }

    callback()
  }

  const validateDefaultModel: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''

    if (!form.enabled && !normalizedValue) {
      callback()
      return
    }

    if (!normalizedValue) {
      callback(new Error('请输入默认模型名称'))
      return
    }

    if (normalizedValue.length > 100) {
      callback(new Error('默认模型名称长度不能超过 100 位'))
      return
    }

    callback()
  }

  const validateApiKey: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''
    const hasExistingKey = currentConfig.value?.hasApiKey ?? false
    const shouldRequireApiKey = form.enabled && (!hasExistingKey || form.clearApiKey)

    if (!normalizedValue && !shouldRequireApiKey) {
      callback()
      return
    }

    if (!normalizedValue) {
      callback(new Error('启用系统配置时必须提供可用的 API Key'))
      return
    }

    if (normalizedValue.length > 512) {
      callback(new Error('API Key 长度不能超过 512 位'))
      return
    }

    callback()
  }

  const formRules: FormRules<typeof form> = {
    baseUrl: [{
      validator: validateBaseUrl,
    }],
    defaultModel: [{
      validator: validateDefaultModel,
    }],
    apiKey: [{
      validator: validateApiKey,
    }],
  }

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
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载系统 AI 配置失败')
    }
    finally {
      isLoading.value = false
    }
  }

  async function saveConfig(formRef: FormInstance | null | undefined) {
    form.baseUrl = form.baseUrl.trim()
    form.defaultModel = form.defaultModel.trim()
    form.apiKey = form.apiKey.trim()

    const isValid = formRef
      ? await formRef.validate().catch(() => false)
      : false

    if (!isValid) {
      return
    }

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
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存系统 AI 配置失败'))
    }
    finally {
      isSaving.value = false
    }
  }

  return {
    currentConfig,
    errorMessage,
    form,
    formRules,
    isLoading,
    isSaving,
    loadConfig,
    saveConfig,
  }
}
