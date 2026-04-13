import type { ChatModelOption, ChatModelSelection, ChatRuntimeConfig } from '@/apis/chat'
import { useStorage } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { getChatModels, getChatRuntimeConfig } from '@/apis/chat'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

const CHAT_MODEL_SETTINGS_STORAGE_KEY = 'samepage_chat_model_settings'

function createModelSelection(): ChatModelSelection {
  return {
    model: '',
  }
}

function normalizeModelSelection(value: ChatModelSelection): ChatModelSelection {
  return {
    model: value.model.trim(),
  }
}

function toDraft(value: ChatModelSelection): ChatModelSelection {
  return {
    model: value.model,
  }
}

function createEmptyRuntimeConfig(): ChatRuntimeConfig {
  return {
    enabled: false,
    ready: false,
    providerLabel: null,
  }
}

export function useChatProviderSettings() {
  const storedSelection = useStorage<ChatModelSelection>(
    CHAT_MODEL_SETTINGS_STORAGE_KEY,
    createModelSelection(),
    undefined,
    { mergeDefaults: true },
  )
  const dialogVisible = shallowRef(false)
  const isLoadingRuntimeConfig = shallowRef(true)
  const isLoadingModels = shallowRef(false)
  const runtimeConfig = shallowRef<ChatRuntimeConfig>(createEmptyRuntimeConfig())
  const modelOptions = shallowRef<ChatModelOption[]>([])
  const draft = reactive<ChatModelSelection>(toDraft(storedSelection.value))

  const selectedModel = computed(() => {
    const normalizedSelection = normalizeModelSelection(storedSelection.value)
    return normalizedSelection.model || null
  })
  const isConfigured = computed(() => Boolean(
    runtimeConfig.value.enabled
    && runtimeConfig.value.ready
    && selectedModel.value,
  ))
  const currentModelLabel = computed(() => selectedModel.value || '未选择模型')
  const currentProviderLabel = computed(() => {
    if (isLoadingRuntimeConfig.value && !runtimeConfig.value.providerLabel) {
      return '正在加载 AI 服务状态'
    }

    if (!runtimeConfig.value.ready) {
      return '管理员尚未完成 AI 服务设置'
    }

    if (!runtimeConfig.value.enabled) {
      return 'AI 服务暂未开启'
    }

    return runtimeConfig.value.providerLabel || 'AI 服务已就绪'
  })
  const inputPlaceholder = computed(() => {
    if (isLoadingRuntimeConfig.value && !runtimeConfig.value.providerLabel) {
      return '正在加载 AI 服务状态'
    }

    if (!runtimeConfig.value.ready) {
      return '管理员尚未完成 AI 服务设置'
    }

    if (!runtimeConfig.value.enabled) {
      return 'AI 服务暂未开启'
    }

    if (!selectedModel.value) {
      return '请先选择模型'
    }

    return '输入消息...'
  })

  onMounted(() => {
    void loadRuntimeConfig()
  })

  async function loadRuntimeConfig(options: { silent?: boolean } = {}) {
    const { silent = false } = options
    isLoadingRuntimeConfig.value = true

    try {
      runtimeConfig.value = await getChatRuntimeConfig()
      return true
    }
    catch (error) {
      if (!silent) {
        ElMessage.error(getRequestErrorDisplayMessage(error, '加载 AI 服务状态失败'))
      }

      return false
    }
    finally {
      isLoadingRuntimeConfig.value = false
    }
  }

  async function openDialog() {
    Object.assign(draft, toDraft(storedSelection.value))
    dialogVisible.value = true
    await refreshModels({
      silent: false,
      showSuccessMessage: false,
    })
  }

  function closeDialog() {
    dialogVisible.value = false
  }

  async function refreshModels(options: { silent?: boolean, showSuccessMessage?: boolean } = {}) {
    const {
      silent = false,
      showSuccessMessage = true,
    } = options

    const hasRuntimeConfig = await loadRuntimeConfig({ silent })
    if (!hasRuntimeConfig) {
      return
    }

    if (!runtimeConfig.value.ready) {
      modelOptions.value = []

      if (!silent) {
        ElMessage.warning('管理员尚未完成 AI 服务设置')
      }
      return
    }

    isLoadingModels.value = true

    try {
      const result = await getChatModels()
      modelOptions.value = result.models

      if (!draft.model && result.models.length > 0) {
        draft.model = result.models[0].id
      }

      if (showSuccessMessage) {
        ElMessage.success(result.models.length > 0 ? `已获取 ${result.models.length} 个模型` : '当前未获取到可用模型')
      }
    }
    catch (error) {
      modelOptions.value = []

      if (!silent) {
        ElMessage.error(getRequestErrorDisplayMessage(error, '获取模型列表失败'))
      }
    }
    finally {
      isLoadingModels.value = false
    }
  }

  function saveSettings() {
    const selection = normalizeModelSelection(draft)

    if (!selection.model) {
      ElMessage.warning('请选择模型')
      return false
    }

    storedSelection.value = selection
    dialogVisible.value = false
    ElMessage.success('聊天模型已保存')
    return true
  }

  return {
    dialogVisible,
    draft,
    inputPlaceholder,
    isConfigured,
    isLoadingModels,
    isLoadingRuntimeConfig,
    modelOptions,
    selectedModel,
    currentModelLabel,
    currentProviderLabel,
    openDialog,
    closeDialog,
    refreshModels,
    saveSettings,
  }
}
