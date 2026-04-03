import type { ChatModelOption, ChatProviderConfig, ChatProviderLookup } from '@/apis/chat'
import { useStorage } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { computed, reactive, shallowRef, watch } from 'vue'
import { getChatModels } from '@/apis/chat'

const CHAT_PROVIDER_STORAGE_KEY = 'samepage_chat_provider'
const CHAT_MODEL_CACHE_STORAGE_KEY = 'samepage_chat_model_cache'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

function createProviderConfig(): ChatProviderConfig {
  return {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: '',
    model: '',
  }
}

function normalizeProviderLookup(provider: ChatProviderLookup): ChatProviderLookup {
  return {
    baseUrl: provider.baseUrl.trim(),
    apiKey: provider.apiKey.trim(),
  }
}

function normalizeProviderConfig(provider: ChatProviderConfig): ChatProviderConfig {
  return {
    ...normalizeProviderLookup(provider),
    model: provider.model.trim(),
  }
}

function hasProviderConfig(provider: ChatProviderConfig) {
  return Boolean(
    provider.baseUrl.trim()
    && provider.apiKey.trim()
    && provider.model.trim(),
  )
}

function toDraft(provider: ChatProviderConfig): ChatProviderConfig {
  return {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.model,
  }
}

function resolveBaseUrlLabel(baseUrl: string) {
  try {
    return new URL(baseUrl).host
  }
  catch {
    return baseUrl
  }
}

function buildModelCacheKey(provider: ChatProviderLookup) {
  const rawKey = `${provider.baseUrl.trim()}\n${provider.apiKey.trim()}`
  let hash = 5381

  for (let index = 0; index < rawKey.length; index += 1) {
    hash = ((hash << 5) + hash) ^ rawKey.charCodeAt(index)
  }

  return `${provider.baseUrl.trim()}::${hash >>> 0}`
}

export function useChatProviderSettings() {
  const storedProvider = useStorage<ChatProviderConfig>(
    CHAT_PROVIDER_STORAGE_KEY,
    createProviderConfig(),
    undefined,
    { mergeDefaults: true },
  )
  const modelCache = useStorage<Record<string, ChatModelOption[]>>(
    CHAT_MODEL_CACHE_STORAGE_KEY,
    {},
    undefined,
    { mergeDefaults: true },
  )
  const dialogVisible = shallowRef(false)
  const isLoadingModels = shallowRef(false)
  const modelOptions = shallowRef<ChatModelOption[]>([])
  const draft = reactive<ChatProviderConfig>(toDraft(storedProvider.value))
  const draftModelCacheKey = computed(() => {
    const provider = normalizeProviderLookup(draft)
    if (!provider.baseUrl || !provider.apiKey) {
      return ''
    }

    return buildModelCacheKey(provider)
  })

  const isConfigured = computed(() => hasProviderConfig(storedProvider.value))
  const providerConfig = computed<ChatProviderConfig | null>(() => {
    if (!isConfigured.value) {
      return null
    }

    return normalizeProviderConfig(storedProvider.value)
  })
  const currentModelLabel = computed(() => providerConfig.value?.model || '未选择模型')
  const currentProviderLabel = computed(() => {
    if (!providerConfig.value) {
      return '未配置 AI 提供商'
    }

    return resolveBaseUrlLabel(providerConfig.value.baseUrl)
  })

  watch(
    draftModelCacheKey,
    (cacheKey) => {
      modelOptions.value = cacheKey
        ? modelCache.value[cacheKey] ?? []
        : []
    },
    { immediate: true },
  )

  function openDialog() {
    Object.assign(draft, toDraft(storedProvider.value))
    dialogVisible.value = true
  }

  function closeDialog() {
    dialogVisible.value = false
  }

  async function refreshModels() {
    const provider = normalizeProviderLookup(draft)
    if (!provider.baseUrl || !provider.apiKey) {
      ElMessage.warning('请先填写 API 地址和 API Key')
      return
    }

    isLoadingModels.value = true

    try {
      const result = await getChatModels(provider)
      modelOptions.value = result.models
      modelCache.value = {
        ...modelCache.value,
        [buildModelCacheKey(provider)]: result.models,
      }

      if (!draft.model && result.models.length > 0) {
        draft.model = result.models[0].id
      }

      ElMessage.success(result.models.length > 0 ? `已获取 ${result.models.length} 个模型` : '当前提供商未返回模型列表')
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '获取模型列表失败')
    }
    finally {
      isLoadingModels.value = false
    }
  }

  function saveSettings() {
    const provider = normalizeProviderConfig(draft)

    if (!provider.baseUrl) {
      ElMessage.warning('请填写 API 地址')
      return false
    }

    if (!provider.apiKey) {
      ElMessage.warning('请填写 API Key')
      return false
    }

    if (!provider.model) {
      ElMessage.warning('请选择或输入模型')
      return false
    }

    storedProvider.value = provider
    dialogVisible.value = false
    ElMessage.success('聊天模型配置已保存')
    return true
  }

  return {
    dialogVisible,
    draft,
    modelOptions,
    isLoadingModels,
    isConfigured,
    providerConfig,
    currentModelLabel,
    currentProviderLabel,
    openDialog,
    closeDialog,
    refreshModels,
    saveSettings,
  }
}
