import type { MaybeRefOrGetter } from 'vue'
import type { ChatModelItem, ChatModelSelection, ChatRuntimeConfig, ChatSessionDetail, ChatSessionSummary } from '@/apis/chat'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, shallowRef, toValue } from 'vue'
import {
  createChatSession,
  deleteChatSession,
  getChatModels,
  getChatRuntimeConfig,
  getChatSession,
  getChatSessions,
  streamChatCompletion,
} from '@/apis/chat'
import { useUiStore } from '@/stores/ui'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

/**
 * 聊天会话摘要模型。
 */
export interface ChatSession extends ChatSessionSummary {}

/**
 * 当前激活会话详情模型。
 */
export interface ActiveChatSession extends ChatSessionDetail {}

function createModelSelection(model: string | null = null): ChatModelSelection {
  return {
    model: model ?? '',
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

export function useChat() {
  const providerSettings = useChatProviderSettingsState()
  const workspace = useChatWorkspaceState(providerSettings.selectedModel)
  const modelBadgeStateClass = computed(() => providerSettings.isConfigured.value ? 'configured' : 'idle')

  return {
    ...providerSettings,
    ...workspace,
    modelBadgeStateClass,
  }
}

function useChatProviderSettingsState() {
  const uiStore = useUiStore()
  const dialogVisible = shallowRef(false)
  const isLoadingRuntimeConfig = shallowRef(true)
  const isLoadingModels = shallowRef(false)
  const runtimeConfig = shallowRef<ChatRuntimeConfig>(createEmptyRuntimeConfig())
  const modelOptions = shallowRef<ChatModelItem[]>([])
  const draft = reactive<ChatModelSelection>(toDraft(createModelSelection(uiStore.chatSelectedModel)))
  const selectedModel = computed(() => uiStore.chatSelectedModel)
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
    Object.assign(draft, toDraft(createModelSelection(uiStore.chatSelectedModel)))
    dialogVisible.value = true
    await refreshModels({
      silent: false,
      showSuccessMessage: false,
    })
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

    uiStore.setChatSelectedModel(selection.model)
    dialogVisible.value = false
    ElMessage.success('聊天模型已保存')
    return true
  }

  return {
    currentModelLabel,
    currentProviderLabel,
    dialogVisible,
    draft,
    inputPlaceholder,
    isConfigured,
    isLoadingModels,
    isLoadingRuntimeConfig,
    modelOptions,
    openDialog,
    refreshModels,
    saveSettings,
    selectedModel,
  }
}

function useChatWorkspaceState(model: MaybeRefOrGetter<string | null>) {
  const sessions = shallowRef<ChatSession[]>([])
  const activeSessionId = shallowRef<string | null>(null)
  const activeSession = shallowRef<ActiveChatSession | null>(null)
  const isLoadingSessions = shallowRef(false)
  const isStreaming = shallowRef(false)
  const streamingContent = shallowRef('')

  void loadSessions()

  async function loadSessions(options: { preserveActiveSessionId?: boolean } = {}) {
    const { preserveActiveSessionId = true } = options
    isLoadingSessions.value = true

    try {
      const nextSessions = await getChatSessions()
      sessions.value = nextSessions

      if (nextSessions.length === 0) {
        activeSessionId.value = null
        activeSession.value = null
        return
      }

      const nextActiveSessionId = preserveActiveSessionId && activeSessionId.value && nextSessions.some(session => session.id === activeSessionId.value)
        ? activeSessionId.value
        : nextSessions[0].id

      if (!nextActiveSessionId) {
        activeSessionId.value = null
        activeSession.value = null
        return
      }

      await selectSession(nextActiveSessionId)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '加载聊天会话失败'))
    }
    finally {
      isLoadingSessions.value = false
    }
  }

  async function createSession() {
    try {
      const session = await createChatSession()
      prependSessionSummary(session)
      activeSessionId.value = session.id
      activeSession.value = session
      return session
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '创建聊天会话失败'))
      return null
    }
  }

  async function selectSession(id: string) {
    const isCurrentSession = activeSession.value?.id === id
    activeSessionId.value = id

    if (isCurrentSession) {
      return
    }

    try {
      activeSession.value = await getChatSession(id)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '加载聊天会话失败'))
    }
  }

  async function deleteSession(id: string) {
    try {
      await deleteChatSession(id)
      sessions.value = sessions.value.filter(session => session.id !== id)

      if (activeSessionId.value !== id) {
        return
      }

      const nextSession = sessions.value[0]
      if (!nextSession) {
        activeSessionId.value = null
        activeSession.value = null
        return
      }

      await selectSession(nextSession.id)
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '删除聊天会话失败'))
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming.value) {
      return
    }

    const selectedModel = toValue(model)
    if (!selectedModel) {
      ElMessage.warning('请先选择模型')
      return
    }

    let sessionId = activeSessionId.value
    if (!sessionId) {
      const createdSession = await createSession()
      sessionId = createdSession?.id ?? null
    }

    if (!sessionId) {
      return
    }

    if (!activeSession.value || activeSession.value.id !== sessionId) {
      await selectSession(sessionId)
    }

    const session = activeSession.value
    if (!session) {
      return
    }

    const normalizedContent = content.trim()
    const nextTitle = session.messages.length === 0
      ? buildSessionTitle(normalizedContent)
      : session.title

    activeSession.value = {
      ...session,
      title: nextTitle,
      messages: [
        ...session.messages,
        { role: 'user', content: normalizedContent },
        { role: 'assistant', content: '' },
      ],
    }

    patchSessionSummary(session.id, {
      title: nextTitle,
    })

    isStreaming.value = true
    streamingContent.value = ''
    try {
      await streamChatCompletion(
        session.id,
        selectedModel,
        normalizedContent,
        (chunk) => {
          streamingContent.value += chunk
          updateActiveAssistantMessage(streamingContent.value)
        },
      )

      await refreshActiveSession(session.id)
      await refreshSessionList()
    }
    catch (error) {
      updateActiveAssistantMessage(
        getRequestErrorDisplayMessage(error, '抱歉，请求失败，请稍后重试。'),
        { onlyWhenEmpty: true },
      )
    }
    finally {
      isStreaming.value = false
      streamingContent.value = ''
    }
  }

  async function refreshActiveSession(sessionId: string) {
    try {
      activeSession.value = await getChatSession(sessionId)
      activeSessionId.value = sessionId
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '刷新聊天详情失败'))
    }
  }

  async function refreshSessionList() {
    try {
      sessions.value = await getChatSessions()
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '刷新聊天列表失败'))
    }
  }

  function prependSessionSummary(session: ChatSessionSummary) {
    sessions.value = [
      session,
      ...sessions.value.filter(item => item.id !== session.id),
    ]
  }

  function patchSessionSummary(
    sessionId: string,
    input: Partial<Pick<ChatSessionSummary, 'title'>>,
  ) {
    const targetSession = sessions.value.find(session => session.id === sessionId)

    if (!targetSession) {
      return
    }

    sessions.value = [
      {
        ...targetSession,
        ...input,
      },
      ...sessions.value.filter(session => session.id !== sessionId),
    ]
  }

  function updateActiveAssistantMessage(
    content: string,
    options: { onlyWhenEmpty?: boolean } = {},
  ) {
    if (!activeSession.value) {
      return
    }

    const lastMessage = activeSession.value.messages.at(-1)
    if (lastMessage?.role !== 'assistant') {
      return
    }

    if (options.onlyWhenEmpty && lastMessage.content) {
      return
    }

    const nextMessages = [...activeSession.value.messages]
    nextMessages[nextMessages.length - 1] = {
      role: 'assistant',
      content,
    }

    activeSession.value = {
      ...activeSession.value,
      messages: nextMessages,
    }
  }

  return {
    activeSession,
    activeSessionId,
    createSession,
    deleteSession,
    isLoadingSessions,
    isStreaming,
    selectSession,
    sendMessage,
    sessions,
  }
}

function buildSessionTitle(content: string) {
  return content.slice(0, 30) + (content.length > 30 ? '...' : '')
}
