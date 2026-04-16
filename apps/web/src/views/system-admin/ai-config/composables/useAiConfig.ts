import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import type { Ref } from 'vue'
import type {
  SystemAiConfig,
  SystemAiServiceStatus,
} from '@/apis/system-admin'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, shallowRef } from 'vue'
import {
  getSystemAiConfig,
  getSystemAiServiceStatus,
  updateSystemAiConfig,
  updateSystemAiServiceStatus,
} from '@/apis/system-admin'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useAiConfig(options: {
  systemAiConfigFormRef: Ref<FormInstance | null>
}) {
  type RuleValidator = NonNullable<FormItemRule['validator']>

  const currentConfig = shallowRef<SystemAiConfig | null>(null)
  const currentServiceStatus = shallowRef<SystemAiServiceStatus | null>(null)
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const isSaving = shallowRef(false)
  const isUpdatingServiceStatus = shallowRef(false)
  const form = reactive({
    baseUrl: '',
    apiKey: '',
  })

  const configStatusLabel = computed(() => currentServiceStatus.value?.enabled ? '已启用' : '未启用')
  const configStatusStateClass = computed(() => currentServiceStatus.value?.enabled ? 'enabled' : 'disabled')
  const hasSavedApiKey = computed(() => currentConfig.value?.hasApiKey ?? false)
  const isEditingApiKey = shallowRef(false)

  const validateBaseUrl: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''

    if (!(currentServiceStatus.value?.enabled ?? false) && !normalizedValue) {
      callback()
      return
    }

    if (!normalizedValue) {
      callback(new Error('请输入 API 地址'))
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

  const validateApiKey: RuleValidator = (_rule, value, callback) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''
    const shouldRequireApiKey = (currentServiceStatus.value?.enabled ?? false) && !hasSavedApiKey.value

    if (!normalizedValue && !shouldRequireApiKey) {
      callback()
      return
    }

    if (!normalizedValue) {
      callback(new Error('启用 AI 服务前必须填写可用的 API Key'))
      return
    }

    if (normalizedValue.length > 512) {
      callback(new Error('API Key 长度不能超过 512 位'))
      return
    }

    callback()
  }

  const formRules: FormRules<typeof form> = {
    baseUrl: [{ validator: validateBaseUrl }],
    apiKey: [{ validator: validateApiKey }],
  }

  async function loadConfig() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const [config, serviceStatus] = await Promise.all([
        getSystemAiConfig(),
        getSystemAiServiceStatus(),
      ])
      currentConfig.value = config
      currentServiceStatus.value = serviceStatus
      form.baseUrl = config.baseUrl || ''
      resetApiKeyDraft()
    }
    catch (error) {
      errorMessage.value = getRequestErrorDisplayMessage(error, '加载 AI 配置失败')
    }
    finally {
      isLoading.value = false
    }
  }

  async function saveConfig(formRef: FormInstance | null | undefined) {
    normalizeForm()
    const isValid = formRef ? await formRef.validate().catch(() => false) : false

    if (!isValid) {
      return
    }

    isSaving.value = true

    try {
      currentConfig.value = await updateSystemAiConfig({
        baseUrl: form.baseUrl || undefined,
        apiKey: form.apiKey || undefined,
      })
      form.baseUrl = currentConfig.value.baseUrl || ''
      resetApiKeyDraft()
      ElMessage.success('AI 配置已保存')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存 AI 配置失败'))
    }
    finally {
      isSaving.value = false
    }
  }

  async function updateServiceStatus(nextEnabled: boolean) {
    const previousStatus = currentServiceStatus.value
    currentServiceStatus.value = {
      enabled: nextEnabled,
      updatedAt: previousStatus?.updatedAt ?? null,
      updatedBy: previousStatus?.updatedBy ?? null,
      updatedByUser: previousStatus?.updatedByUser ?? null,
    }
    isUpdatingServiceStatus.value = true

    try {
      const nextStatus = await updateSystemAiServiceStatus({
        enabled: nextEnabled,
      })

      currentServiceStatus.value = nextStatus

      if (currentConfig.value) {
        currentConfig.value = {
          ...currentConfig.value,
          updatedAt: nextStatus.updatedAt,
          updatedBy: nextStatus.updatedBy,
          updatedByUser: nextStatus.updatedByUser,
        }
      }

      ElMessage.success(nextEnabled ? 'AI 服务已启用' : 'AI 服务已关闭')
    }
    catch (error) {
      currentServiceStatus.value = previousStatus
      ElMessage.error(getRequestErrorDisplayMessage(error, nextEnabled ? '启用 AI 服务失败' : '关闭 AI 服务失败'))
    }
    finally {
      isUpdatingServiceStatus.value = false
    }
  }

  function handleServiceStatusChange(value: string | number | boolean) {
    if (typeof value !== 'boolean') {
      return
    }

    void updateServiceStatus(value)
  }

  onMounted(loadConfig)

  async function handleSaveConfig() {
    await saveConfig(options.systemAiConfigFormRef.value)
  }

  function clearApiKeyValidation() {
    options.systemAiConfigFormRef.value?.clearValidate('apiKey')
  }

  function handleStartApiKeyEdit() {
    startApiKeyEdit()
    clearApiKeyValidation()
  }

  function handleKeepSavedApiKey() {
    keepSavedApiKey()
    clearApiKeyValidation()
  }

  return {
    configStatusLabel,
    configStatusStateClass,
    currentConfig,
    currentServiceStatus,
    errorMessage,
    form,
    formRules,
    handleKeepSavedApiKey,
    handleSaveConfig,
    handleServiceStatusChange,
    handleStartApiKeyEdit,
    hasSavedApiKey,
    isEditingApiKey,
    isLoading,
    isSaving,
    isUpdatingServiceStatus,
    keepSavedApiKey,
    saveConfig,
    startApiKeyEdit,
    updateServiceStatus,
  }

  function normalizeForm() {
    form.baseUrl = form.baseUrl.trim()
    form.apiKey = form.apiKey.trim()
  }

  function startApiKeyEdit() {
    form.apiKey = ''
    isEditingApiKey.value = true
  }

  function keepSavedApiKey() {
    resetApiKeyDraft()
  }

  function resetApiKeyDraft() {
    form.apiKey = ''
    isEditingApiKey.value = false
  }
}
