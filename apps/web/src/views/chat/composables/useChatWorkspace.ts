import type { MaybeRefOrGetter } from 'vue'
import type {
  ChatProviderConfig,
  ChatSessionDetail,
  ChatSessionSummary,
} from '@/apis/chat'
import { ElMessage } from 'element-plus'
import { shallowRef, toValue } from 'vue'
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  getChatSessions,
  streamChatCompletion,
} from '@/apis/chat'

/**
 * 聊天会话摘要模型。
 */
export interface ChatSession extends ChatSessionSummary {}

/**
 * 当前激活会话详情模型。
 */
export interface ActiveChatSession extends ChatSessionDetail {}

export function useChatWorkspace(providerConfig: MaybeRefOrGetter<ChatProviderConfig | null>) {
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
      ElMessage.error(error instanceof Error ? error.message : '加载聊天会话失败')
    }
    finally {
      isLoadingSessions.value = false
    }
  }

  async function createSession() {
    try {
      const session = await createChatSession()
      upsertSessionSummary(session)
      activeSessionId.value = session.id
      activeSession.value = session
      return session
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '创建聊天会话失败')
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
      ElMessage.error(error instanceof Error ? error.message : '加载聊天会话失败')
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
      ElMessage.error(error instanceof Error ? error.message : '删除聊天会话失败')
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming.value) {
      return
    }

    const provider = toValue(providerConfig)
    if (!provider) {
      ElMessage.warning('请先配置 API 地址、Key 和模型')
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
    const updatedAt = new Date().toISOString()

    activeSession.value = {
      ...session,
      title: nextTitle,
      updatedAt,
      messages: [
        ...session.messages,
        { role: 'user', content: normalizedContent },
        { role: 'assistant', content: '' },
      ],
    }

    upsertSessionSummary({
      id: session.id,
      title: nextTitle,
      createdAt: session.createdAt,
      updatedAt,
    })

    isStreaming.value = true
    streamingContent.value = ''
    let hasStreamError = false

    await streamChatCompletion(
      session.id,
      provider,
      normalizedContent,
      (chunk) => {
        streamingContent.value += chunk
        updateActiveAssistantMessage(streamingContent.value)
      },
      () => {
        isStreaming.value = false
        streamingContent.value = ''
      },
      (error) => {
        hasStreamError = true
        isStreaming.value = false
        const errorMessage = error instanceof Error && error.message
          ? error.message
          : '抱歉，请求失败，请稍后重试。'

        updateActiveAssistantMessage(errorMessage, { onlyWhenEmpty: true })
        streamingContent.value = ''
      },
    )

    if (!hasStreamError) {
      await refreshActiveSession(session.id)
      await refreshSessionList()
    }
  }

  async function refreshActiveSession(sessionId: string) {
    try {
      activeSession.value = await getChatSession(sessionId)
      activeSessionId.value = sessionId
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '刷新聊天详情失败')
    }
  }

  async function refreshSessionList() {
    try {
      sessions.value = await getChatSessions()
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '刷新聊天列表失败')
    }
  }

  function upsertSessionSummary(session: ChatSessionSummary) {
    sessions.value = [
      session,
      ...sessions.value.filter(item => item.id !== session.id),
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
    sessions,
    activeSession,
    activeSessionId,
    isLoadingSessions,
    isStreaming,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
  }
}

function buildSessionTitle(content: string) {
  return content.slice(0, 30) + (content.length > 30 ? '...' : '')
}
