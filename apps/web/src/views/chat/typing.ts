import type { ChatSession } from './composables/useChatWorkspace'
import type { ChatMessage, ChatModelOption } from '@/apis/chat'

/**
 * 聊天提供商配置弹窗属性。
 */
export interface ChatProviderSettingsDialogProps {
  models: ChatModelOption[]
  isLoadingModels: boolean
}

/**
 * 聊天提供商配置弹窗事件。
 */
export interface ChatProviderSettingsDialogEmits {
  refreshModels: []
  save: []
}

/**
 * 聊天会话侧边栏属性。
 */
export interface ChatSessionSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string | null
}

/**
 * 聊天会话侧边栏事件。
 */
export interface ChatSessionSidebarEmits {
  create: []
  select: [id: string]
  delete: [id: string]
}

/**
 * 聊天输入框属性。
 */
export interface ChatInputBoxProps {
  disabled: boolean
  placeholder?: string
}

/**
 * 聊天输入框事件。
 */
export interface ChatInputBoxEmits {
  send: [content: string]
}

/**
 * 聊天消息列表属性。
 */
export interface ChatMessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  isConfigured: boolean
}
