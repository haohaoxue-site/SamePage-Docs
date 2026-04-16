/**
 * 聊天消息。
 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 聊天会话摘要。
 */
export interface ChatSessionSummary {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 聊天会话详情。
 */
export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessage[]
}

/**
 * 聊天模型项。
 */
export interface ChatModelItem {
  id: string
  ownedBy: string | null
}

/**
 * 聊天运行时配置。
 */
export interface ChatRuntimeConfig {
  enabled: boolean
  ready: boolean
  providerLabel: string | null
}
